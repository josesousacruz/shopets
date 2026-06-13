import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { Plus } from "lucide-react";
import { StatusBadge } from "~/components/painel/StatusBadge";
import { useActionFeedback, useFlashFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import type { PlanoContaNode } from "~/lib/painel.server";
import { painel, PainelValidationError } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Plano de Contas — Painel Shopets" }];

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const r = await painel.financeiro.planoContas.tree(token);
  return json({ arvore: r.data });
}

export async function action({ request: req }: ActionFunctionArgs) {
  const { token } = await requireAdmin(req);
  const fd = await req.formData();
  const intent = String(fd.get("intent") ?? "");

  try {
    if (intent === "criar") {
      await painel.financeiro.planoContas.create(token, {
        parent_id: fd.get("parent_id") ? Number(fd.get("parent_id")) : null,
        tipo: String(fd.get("tipo") ?? "") || undefined,
        codigo: String(fd.get("codigo")),
        nome: String(fd.get("nome")),
      });
      return redirect("/painel/financeiro/plano-contas?feedback=criar");
    }
    if (intent === "desativar") {
      await painel.financeiro.planoContas.destroy(token, String(fd.get("id")));
      return redirect("/painel/financeiro/plano-contas?feedback=excluir");
    }
    return json({ erro: "Operação desconhecida." }, { status: 400 });
  } catch (e) {
    if (e instanceof PainelValidationError) return json({ erro: e.message }, { status: e.status });
    return json({ erro: "Falha ao processar." }, { status: 500 });
  }
}

function Node({ node, nivel }: { node: PlanoContaNode; nivel: number }) {
  return (
    <>
      <tr>
        <td style={{ paddingLeft: 12 + nivel * 22 }}>
          <strong>{node.codigo}</strong> {node.nome}
        </td>
        <td><StatusBadge tone={node.tipo === "receita" ? "ok" : "warn"}>{node.tipo}</StatusBadge></td>
        <td>{node.ativo ? "Ativo" : "Inativo"}</td>
        <td className="pn-row-actions">
          {node.ativo ? (
            <Form method="post" replace style={{ display: "inline" }}>
              <input type="hidden" name="intent" value="desativar" />
              <input type="hidden" name="id" value={node.id} />
              <button type="submit" className="pn-btn-link">Desativar</button>
            </Form>
          ) : null}
        </td>
      </tr>
      {node.filhos.map((f) => <Node key={f.id} node={f} nivel={nivel + 1} />)}
    </>
  );
}

function flatten(nodes: PlanoContaNode[], out: PlanoContaNode[] = []): PlanoContaNode[] {
  for (const n of nodes) {
    out.push(n);
    flatten(n.filhos, out);
  }
  return out;
}

export default function PlanoContas() {
  const { arvore } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  useActionFeedback(actionData);
  useFlashFeedback();

  const novo = searchParams.get("novo") === "1";
  const flat = flatten(arvore);

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Financeiro</span>
          <h1>Plano de Contas</h1>
          <p>Estrutura hierárquica de receitas e despesas.</p>
        </div>
        <div className="pn-head-actions">
          <Link to="/painel/financeiro" className="pn-btn-sm">Voltar</Link>
          <Link to="?novo=1" className="pn-btn-sm mint" preventScrollReset><Plus size={14} /> Nova conta</Link>
        </div>
      </div>

      <div className="pn-card pn-table-wrap">
        <table className="pn-table">
          <thead>
            <tr><th>Conta</th><th>Tipo</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {arvore.length === 0 ? (
              <tr><td colSpan={4} className="pn-empty-row">Nenhuma conta cadastrada.</td></tr>
            ) : (
              arvore.map((n) => <Node key={n.id} node={n} nivel={0} />)
            )}
          </tbody>
        </table>
      </div>

      {novo ? (
        <div className="pn-drawer-backdrop" role="dialog" aria-modal="true">
          <div className="pn-drawer">
            <div className="pn-drawer-head">
              <h3>Nova conta</h3>
              <Link to="/painel/financeiro/plano-contas" className="pn-btn-link" preventScrollReset>Fechar</Link>
            </div>
            <Form method="post" replace>
              <input type="hidden" name="intent" value="criar" />
              <div className="pn-drawer-body">
                <div className="pn-field">
                  <label htmlFor="parent_id">Conta-pai (vazio = raiz)</label>
                  <select id="parent_id" name="parent_id" defaultValue="">
                    <option value="">— Raiz —</option>
                    {flat.map((n) => <option key={n.id} value={n.id}>{n.codigo} {n.nome}</option>)}
                  </select>
                </div>
                <div className="pn-field">
                  <label htmlFor="tipo">Tipo (apenas para raiz)</label>
                  <select id="tipo" name="tipo" defaultValue="despesa">
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>
                <div className="pn-field-row">
                  <div className="pn-field">
                    <label htmlFor="codigo">Código *</label>
                    <input id="codigo" name="codigo" required autoFocus />
                  </div>
                  <div className="pn-field">
                    <label htmlFor="nome">Nome *</label>
                    <input id="nome" name="nome" required />
                  </div>
                </div>
              </div>
              <div className="pn-drawer-foot">
                <Link to="/painel/financeiro/plano-contas" className="pn-btn-sm" preventScrollReset>Cancelar</Link>
                <button type="submit" className="pn-btn-sm mint" disabled={enviando}>{enviando ? "Salvando…" : "Salvar"}</button>
              </div>
            </Form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
