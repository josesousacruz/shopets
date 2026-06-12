import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData, useSearchParams } from "@remix-run/react";
import { Filter, AlertTriangle } from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Estoque — Painel Shopets" }];

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const url = new URL(req.url);

  const [saldos, depRes] = await Promise.all([
    painel.estoque.list(token, {
      q: url.searchParams.get("q") ?? undefined,
      deposito_id: url.searchParams.get("deposito_id") ? Number(url.searchParams.get("deposito_id")) : undefined,
      abaixo_minimo: url.searchParams.get("abaixo_minimo") === "1",
    }),
    painel.estoque.depositos(token),
  ]);

  return json({ saldos: saldos.data, meta: saldos.meta, depositos: depRes.data });
}

export default function EstoqueIndex() {
  const { saldos, meta, depositos } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Operação</span>
          <h1>Estoque</h1>
          <p>{meta.total} saldo(s) registrado(s) em {depositos.length} depósito(s).</p>
        </div>
      </div>

      <div className="pn-card pn-filters">
        <Form method="get" className="filters-row">
          <input name="q" defaultValue={searchParams.get("q") ?? ""} placeholder="SKU ou produto" />
          <select name="deposito_id" defaultValue={searchParams.get("deposito_id") ?? ""}>
            <option value="">Todos depósitos</option>
            {depositos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}{d.default ? " (padrão)" : ""}
              </option>
            ))}
          </select>
          <label className="pn-check">
            <input type="checkbox" name="abaixo_minimo" value="1" defaultChecked={searchParams.get("abaixo_minimo") === "1"} />
            Apenas abaixo do mínimo
          </label>
          <button className="pn-btn-sm mint"><Filter size={14} /> Filtrar</button>
        </Form>
      </div>

      <div className="pn-card pn-table-wrap">
        <table className="pn-table">
          <thead>
            <tr>
              <th>Produto / SKU</th>
              <th>Depósito</th>
              <th>Saldo</th>
              <th>Reservado</th>
              <th>Disponível</th>
              <th>Mínimo</th>
            </tr>
          </thead>
          <tbody>
            {saldos.length === 0 ? (
              <tr><td colSpan={6} className="pn-empty-row">Nenhum saldo encontrado.</td></tr>
            ) : saldos.map((s) => {
              const disp = Math.max(0, s.saldo - s.reservado);
              const baixo = s.minimo > 0 && s.saldo < s.minimo;
              return (
                <tr key={s.id}>
                  <td>
                    <strong>{s.variacao?.produto?.nome ?? s.variacao?.nome ?? "—"}</strong>
                    <span className="pn-list-meta">SKU: {s.variacao?.sku ?? "—"}</span>
                  </td>
                  <td>{s.deposito?.nome ?? "—"}</td>
                  <td>{s.saldo}</td>
                  <td>{s.reservado}</td>
                  <td><strong>{disp}</strong></td>
                  <td>
                    {s.minimo}
                    {baixo && <AlertTriangle size={14} color="var(--pn-warning, #d97706)" style={{ marginLeft: 6, verticalAlign: "middle" }} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
