import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { ChevronLeft, History } from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Kardex — Painel Shopets" }];

export async function loader({ request: req, params }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const variacaoId = Number(params.variacaoId);
  if (!variacaoId) {
    throw new Response("Variação não informada", { status: 400 });
  }
  const url = new URL(req.url);
  const depositoIdRaw = url.searchParams.get("deposito_id");
  const deposito_id = depositoIdRaw ? Number(depositoIdRaw) : undefined;

  const [kardex, depRes] = await Promise.all([
    painel.estoque.kardex(token, variacaoId, deposito_id ? { deposito_id } : {}),
    painel.estoque.depositos(token),
  ]);

  const depositoNomes = new Map(depRes.data.map((d) => [d.id, d.nome] as const));

  return json({
    variacaoId,
    movimentos: kardex.data,
    depositos: depRes.data,
    depositoNomes: Object.fromEntries(depositoNomes),
  });
}

const TIPO_LABEL: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
  venda: "Venda",
  devolucao: "Devolução",
};

export default function KardexView() {
  const { variacaoId, movimentos, depositos, depositoNomes } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  let acumulado = 0;
  const linhas = [...movimentos]
    .reverse()
    .map((m) => {
      const delta = m.tipo_movimentacao === "saida" || m.tipo_movimentacao === "venda" ? -m.quantidade : m.quantidade;
      acumulado += delta;
      return { ...m, delta, saldoAcumulado: acumulado };
    })
    .reverse();

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">
            <Link to="/painel/estoque" className="pn-btn-link">
              <ChevronLeft size={12} /> Estoque
            </Link>{" "}
            · Histórico
          </span>
          <h1>
            <History size={18} /> Kardex da variação #{variacaoId}
          </h1>
          <p>
            {movimentos.length} movimentação(ões) registradas. Saldo acumulado calculado a partir do início do
            histórico.
          </p>
        </div>
      </div>

      <Form method="get" className="pn-card pn-filters">
        <div className="filters-row">
          <select name="deposito_id" defaultValue={searchParams.get("deposito_id") ?? ""}>
            <option value="">Todos depósitos</option>
            {depositos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
          <button className="pn-btn-sm mint">Filtrar</button>
        </div>
      </Form>

      <div className="pn-card pn-table-wrap">
        <table className="pn-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Origem</th>
              <th>Depósito</th>
              <th>Qtd</th>
              <th>Saldo acum.</th>
              <th>Obs.</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={7} className="pn-empty-row">
                  Nenhuma movimentação encontrada.
                </td>
              </tr>
            ) : (
              linhas.map((m) => (
                <tr key={m.id_movimentacao}>
                  <td>
                    {m.data_movimentacao
                      ? new Date(m.data_movimentacao).toLocaleString("pt-BR")
                      : new Date(m.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td>{TIPO_LABEL[m.tipo_movimentacao] ?? m.tipo_movimentacao}</td>
                  <td>{m.origem_type ?? "—"}</td>
                  <td>{m.deposito_id ? depositoNomes[m.deposito_id] ?? `#${m.deposito_id}` : "—"}</td>
                  <td>
                    <strong style={{ color: m.delta >= 0 ? "var(--pn-success, #0d9488)" : "#b91c1c" }}>
                      {m.delta >= 0 ? "+" : ""}
                      {m.delta}
                    </strong>
                  </td>
                  <td>{m.saldoAcumulado}</td>
                  <td>{m.observacoes ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
