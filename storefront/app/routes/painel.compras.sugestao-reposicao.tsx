import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { PackageCheck, Truck } from "lucide-react";
import { EmptyState } from "~/components/painel/EmptyState";
import { useActionFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel, PainelValidationError } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Sugestão de Reposição — Painel Shopets" }];

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const r = await painel.compras.sugestaoReposicao(token, {});
  return json({ grupos: r.data });
}

export async function action({ request: req }: ActionFunctionArgs) {
  const { token } = await requireAdmin(req);
  const fd = await req.formData();

  const fornecedor_id = Number(fd.get("fornecedor_id"));
  let itens: { produto_variacao_id: number; qtd: number; custo_unit: number; deposito_id: number }[] = [];
  try {
    itens = JSON.parse(String(fd.get("itens_json") ?? "[]"));
  } catch {
    itens = [];
  }
  if (!fornecedor_id || itens.length === 0) {
    return json({ erro: "Grupo inválido para gerar pedido." }, { status: 422 });
  }

  const deposito_id = itens[0].deposito_id;
  try {
    const r = await painel.compras.create(token, {
      fornecedor_id,
      deposito_id,
      itens: itens.map((i) => ({
        produto_variacao_id: i.produto_variacao_id,
        qtd: i.qtd,
        custo_unit: i.custo_unit,
      })),
    });
    return redirect(`/painel/compras/${r.data.id}?feedback=criar`);
  } catch (e) {
    if (e instanceof PainelValidationError) {
      return json({ erro: e.message }, { status: e.status });
    }
    return json({ erro: "Falha ao gerar pedido." }, { status: 500 });
  }
}

export default function SugestaoReposicao() {
  const { grupos } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  useActionFeedback(actionData);

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Operação</span>
          <h1>Sugestão de Reposição</h1>
          <p>SKUs abaixo do mínimo, agrupados por fornecedor principal.</p>
        </div>
        <div className="pn-head-actions">
          <Link to="/painel/compras" className="pn-btn-sm">
            Voltar
          </Link>
        </div>
      </div>

      {grupos.length === 0 ? (
        <div className="pn-card">
          <EmptyState
            icon={PackageCheck}
            title="Tudo em ordem"
            description="Nenhum SKU está abaixo do mínimo no momento."
          />
        </div>
      ) : (
        grupos.map((g) => (
          <div className="pn-card pn-table-wrap" key={g.fornecedor_id ?? "sem"}>
            <div className="pn-card-head">
              <h3>{g.fornecedor}</h3>
              {g.fornecedor_id ? (
                <Form method="post" replace style={{ display: "inline" }}>
                  <input type="hidden" name="fornecedor_id" value={g.fornecedor_id} />
                  <input
                    type="hidden"
                    name="itens_json"
                    value={JSON.stringify(
                      g.itens.map((i) => ({
                        produto_variacao_id: i.produto_variacao_id,
                        qtd: i.qtd_sugerida,
                        custo_unit: i.custo_unit,
                        deposito_id: i.deposito_id,
                      })),
                    )}
                  />
                  <button type="submit" className="pn-btn-sm mint" disabled={enviando}>
                    <Truck size={14} /> Gerar pedido
                  </button>
                </Form>
              ) : (
                <span className="pn-list-meta">Vincule um fornecedor para gerar pedido.</span>
              )}
            </div>
            <table className="pn-table">
              <thead>
                <tr>
                  <th>Produto / SKU</th>
                  <th>Saldo</th>
                  <th>Mínimo</th>
                  <th>Sugerido</th>
                  <th>Custo unit.</th>
                </tr>
              </thead>
              <tbody>
                {g.itens.map((i) => (
                  <tr key={i.produto_variacao_id}>
                    <td>
                      <strong>{i.produto}</strong>
                      <span className="pn-list-meta">SKU: {i.sku ?? "—"}</span>
                    </td>
                    <td>{i.saldo}</td>
                    <td>{i.minimo}</td>
                    <td>
                      <strong>{i.qtd_sugerida}</strong>
                    </td>
                    <td>{i.custo_unit.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
