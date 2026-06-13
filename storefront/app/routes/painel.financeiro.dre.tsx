import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { Filter } from "lucide-react";
import { KpiStrip } from "~/components/painel/KpiStrip";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";
import { formatBRL } from "~/lib/format";

export const meta: MetaFunction = () => [{ title: "DRE — Painel Shopets" }];

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const url = new URL(req.url);
  const r = await painel.financeiro.dre(token, {
    de: url.searchParams.get("de") ?? undefined,
    ate: url.searchParams.get("ate") ?? undefined,
  });
  return json({ dre: r.data });
}

export default function DRE() {
  const { dre } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Financeiro</span>
          <h1>DRE — Demonstrativo de Resultado</h1>
          <p>Período: {dre.periodo.de} a {dre.periodo.ate} (regime de caixa).</p>
        </div>
        <div className="pn-head-actions">
          <Link to="/painel/financeiro" className="pn-btn-sm">Voltar</Link>
        </div>
      </div>

      <KpiStrip
        items={[
          { label: "Receitas", value: formatBRL(dre.total_receitas), tone: "ok" },
          { label: "Despesas", value: formatBRL(dre.total_despesas), tone: "warn" },
          { label: "Lucro líquido", value: formatBRL(dre.lucro_liquido), tone: dre.lucro_liquido >= 0 ? "ok" : "danger" },
        ]}
      />

      <div className="pn-card pn-filters">
        <Form method="get" className="filters-row">
          <input type="date" name="de" defaultValue={searchParams.get("de") ?? ""} />
          <input type="date" name="ate" defaultValue={searchParams.get("ate") ?? ""} />
          <button className="pn-btn-sm mint"><Filter size={14} /> Aplicar</button>
        </Form>
      </div>

      <div className="pn-grid-2">
        <div className="pn-card pn-table-wrap">
          <div className="pn-card-head"><h3>Receitas</h3><strong>{formatBRL(dre.total_receitas)}</strong></div>
          <table className="pn-table">
            <thead><tr><th>Conta</th><th>Total</th></tr></thead>
            <tbody>
              {dre.receitas.length === 0 ? (
                <tr><td colSpan={2} className="pn-empty-row">Sem receitas.</td></tr>
              ) : (
                dre.receitas.map((r) => (
                  <tr key={r.plano}><td>{r.plano}</td><td>{formatBRL(r.total)}</td></tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pn-card pn-table-wrap">
          <div className="pn-card-head"><h3>Despesas</h3><strong>{formatBRL(dre.total_despesas)}</strong></div>
          <table className="pn-table">
            <thead><tr><th>Conta</th><th>Total</th></tr></thead>
            <tbody>
              {dre.despesas.length === 0 ? (
                <tr><td colSpan={2} className="pn-empty-row">Sem despesas.</td></tr>
              ) : (
                dre.despesas.map((d) => (
                  <tr key={d.plano}><td>{d.plano}</td><td>{formatBRL(d.total)}</td></tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pn-card pn-dre-resultado">
        <span>Resultado líquido do período</span>
        <strong className={dre.lucro_liquido >= 0 ? "pos" : "neg"}>{formatBRL(dre.lucro_liquido)}</strong>
      </div>
    </div>
  );
}
