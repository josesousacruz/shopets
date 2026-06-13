import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { Filter } from "lucide-react";
import { KpiStrip } from "~/components/painel/KpiStrip";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";
import { formatBRL } from "~/lib/format";

export const meta: MetaFunction = () => [{ title: "Fluxo de Caixa — Painel Shopets" }];

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const url = new URL(req.url);
  const r = await painel.financeiro.fluxoCaixa(token, {
    modo: url.searchParams.get("modo") ?? "realizado",
    de: url.searchParams.get("de") ?? undefined,
    ate: url.searchParams.get("ate") ?? undefined,
  });
  return json({ fluxo: r.data, modo: r.modo });
}

export default function FluxoCaixa() {
  const { fluxo, modo } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const maxBar = Math.max(1, ...fluxo.linhas.map((l) => Math.max(l.entradas, l.saidas)));

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Financeiro</span>
          <h1>Fluxo de Caixa</h1>
          <p>Modo: {modo}.</p>
        </div>
        <div className="pn-head-actions">
          <Link to="/painel/financeiro" className="pn-btn-sm">Voltar</Link>
        </div>
      </div>

      <KpiStrip
        items={[
          { label: "Entradas", value: formatBRL(fluxo.totais.entradas), tone: "ok" },
          { label: "Saídas", value: formatBRL(fluxo.totais.saidas), tone: "warn" },
          { label: "Saldo", value: formatBRL(fluxo.totais.saldo), tone: fluxo.totais.saldo >= 0 ? "ok" : "danger" },
        ]}
      />

      <div className="pn-card pn-filters">
        <Form method="get" className="filters-row">
          <select name="modo" defaultValue={searchParams.get("modo") ?? "realizado"}>
            <option value="realizado">Realizado</option>
            <option value="previsto">Previsto</option>
            <option value="consolidado">Consolidado</option>
          </select>
          <input type="date" name="de" defaultValue={searchParams.get("de") ?? ""} />
          <input type="date" name="ate" defaultValue={searchParams.get("ate") ?? ""} />
          <button className="pn-btn-sm mint"><Filter size={14} /> Aplicar</button>
        </Form>
      </div>

      {fluxo.linhas.length > 0 ? (
        <div className="pn-card">
          <div className="pn-fluxo-chart">
            {fluxo.linhas.map((l) => (
              <div className="pn-fluxo-col" key={l.data} title={`${l.data}: +${formatBRL(l.entradas)} / -${formatBRL(l.saidas)}`}>
                <div className="bars">
                  <span className="bar ent" style={{ height: `${(l.entradas / maxBar) * 100}%` }} />
                  <span className="bar sai" style={{ height: `${(l.saidas / maxBar) * 100}%` }} />
                </div>
                <span className="lbl">{l.data.slice(5)}</span>
              </div>
            ))}
          </div>
          <div className="pn-fluxo-legend">
            <span><i className="dot ent" /> Entradas</span>
            <span><i className="dot sai" /> Saídas</span>
          </div>
        </div>
      ) : null}

      <div className="pn-card pn-table-wrap">
        <table className="pn-table">
          <thead>
            <tr><th>Data</th><th>Entradas</th><th>Saídas</th><th>Saldo acumulado</th></tr>
          </thead>
          <tbody>
            {fluxo.linhas.length === 0 ? (
              <tr><td colSpan={4} className="pn-empty-row">Sem movimentações no período.</td></tr>
            ) : (
              fluxo.linhas.map((l) => (
                <tr key={l.data}>
                  <td>{new Date(l.data).toLocaleDateString("pt-BR")}</td>
                  <td>{formatBRL(l.entradas)}</td>
                  <td>{formatBRL(l.saidas)}</td>
                  <td><strong>{formatBRL(l.saldo)}</strong></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
