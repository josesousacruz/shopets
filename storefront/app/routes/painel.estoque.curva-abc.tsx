import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { BarChart3, ChevronLeft } from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Curva ABC — Painel Shopets" }];

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const url = new URL(req.url);
  const periodo = url.searchParams.get("periodo_dias")
    ? Number(url.searchParams.get("periodo_dias"))
    : 90;

  const res = await painel.estoque.curvaAbc(token, { periodo_dias: periodo });
  return json({ data: res.data, meta: res.meta });
}

export default function CurvaAbcView() {
  const { data, meta } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  const topN = data.slice(0, 12);
  const maxReceita = topN.reduce((m, r) => Math.max(m, r.receita_total), 0);
  const classeColor: Record<string, string> = {
    A: "#0d9488",
    B: "#0ea5e9",
    C: "#94a3b8",
  };

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">
            <Link to="/painel/estoque" className="pn-btn-link">
              <ChevronLeft size={12} /> Estoque
            </Link>{" "}
            · Relatório
          </span>
          <h1>
            <BarChart3 size={18} /> Curva ABC
          </h1>
          <p>
            {meta.contagem_total} produto(s) nos últimos {meta.periodo_dias} dias · Receita total{" "}
            {meta.receita_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
      </div>

      <Form method="get" className="pn-card pn-filters">
        <div className="filters-row">
          <label style={{ fontSize: 12.5 }}>Período (dias):</label>
          <select name="periodo_dias" defaultValue={searchParams.get("periodo_dias") ?? "90"}>
            <option value="7">7</option>
            <option value="30">30</option>
            <option value="60">60</option>
            <option value="90">90</option>
            <option value="180">180</option>
            <option value="365">365</option>
          </select>
          <button className="pn-btn-sm">Atualizar</button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 16, fontSize: 12.5, color: "var(--pn-text-muted)" }}>
            <span>
              <strong>A</strong>: {meta.classes.A}
            </span>
            <span>
              <strong>B</strong>: {meta.classes.B}
            </span>
            <span>
              <strong>C</strong>: {meta.classes.C}
            </span>
          </div>
        </div>
      </Form>

      <div className="pn-card" style={{ padding: 16 }}>
        {topN.length === 0 ? (
          <p className="pn-empty-row">Sem dados para o período selecionado.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p className="pn-list-meta" style={{ marginBottom: 4 }}>
              Top {topN.length} produtos por receita
            </p>
            {topN.map((r) => {
              const pct = maxReceita > 0 ? (r.receita_total / maxReceita) * 100 : 0;
              return (
                <div key={r.id_produto} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 200, fontSize: 12.5 }} title={r.produto}>
                    <strong>{r.classe}</strong> · {r.produto.length > 28 ? r.produto.slice(0, 28) + "…" : r.produto}
                  </div>
                  <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, height: 18, position: "relative" }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: classeColor[r.classe] ?? "#94a3b8",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <div style={{ width: 110, fontSize: 12, textAlign: "right" }}>
                    {r.receita_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pn-card pn-table-wrap" style={{ marginTop: 12 }}>
        <table className="pn-table">
          <thead>
            <tr>
              <th>Classe</th>
              <th>Produto</th>
              <th>Qtd vendida</th>
              <th>Receita</th>
              <th>% receita</th>
              <th>% acumulado</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="pn-empty-row">
                  Sem dados.
                </td>
              </tr>
            ) : (
              data.map((r) => (
                <tr key={r.id_produto}>
                  <td>
                    <strong>{r.classe}</strong>
                  </td>
                  <td>{r.produto}</td>
                  <td>{r.qtd_total}</td>
                  <td>
                    {r.receita_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td>{r.perc.toFixed(2)}%</td>
                  <td>{r.perc_acumulado.toFixed(2)}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
