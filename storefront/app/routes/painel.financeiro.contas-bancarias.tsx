import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { Landmark, Pencil, Plus } from "lucide-react";
import { EmptyState } from "~/components/painel/EmptyState";
import { StatusBadge } from "~/components/painel/StatusBadge";
import { useActionFeedback, useFlashFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { drawerShouldRevalidate } from "~/lib/drawer-revalidate";
import { painel, PainelValidationError } from "~/lib/painel.server";
import { formatBRL } from "~/lib/format";

export const meta: MetaFunction = () => [{ title: "Contas Bancárias — Painel Shopets" }];

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const r = await painel.financeiro.contasBancarias.list(token);
  return json({ contas: r.data });
}

/** Abrir/fechar o drawer (?novo/?editar) não refaz a listagem — abre instantâneo. */
export const shouldRevalidate = drawerShouldRevalidate(["novo", "editar"]);

export async function action({ request: req }: ActionFunctionArgs) {
  const { token } = await requireAdmin(req);
  const fd = await req.formData();
  const intent = String(fd.get("intent") ?? "");
  const body = {
    tipo: String(fd.get("tipo")),
    nome: String(fd.get("nome")),
    banco: String(fd.get("banco") ?? "") || null,
    agencia: String(fd.get("agencia") ?? "") || null,
    conta: String(fd.get("conta") ?? "") || null,
    saldo_inicial: fd.get("saldo_inicial") ? Number(fd.get("saldo_inicial")) : 0,
    ativo: fd.get("ativo") === "1",
  };

  try {
    if (intent === "criar") await painel.financeiro.contasBancarias.create(token, body);
    else if (intent === "editar") await painel.financeiro.contasBancarias.update(token, String(fd.get("id")), body);
    else if (intent === "excluir") {
      await painel.financeiro.contasBancarias.destroy(token, String(fd.get("id")));
      return redirect("/painel/financeiro/contas-bancarias?feedback=excluir");
    } else return json({ erro: "Operação desconhecida." }, { status: 400 });
  } catch (e) {
    if (e instanceof PainelValidationError) return json({ erro: e.message }, { status: e.status });
    return json({ erro: "Falha ao salvar." }, { status: 500 });
  }
  return redirect(`/painel/financeiro/contas-bancarias?feedback=${intent === "criar" ? "criar" : "editar"}`);
}

export default function ContasBancarias() {
  const { contas } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  useActionFeedback(actionData);
  useFlashFeedback();

  const editId = searchParams.get("editar");
  const editando = editId ? contas.find((c) => String(c.id) === editId) ?? null : null;
  const aberto = editando || searchParams.get("novo") === "1";

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Financeiro</span>
          <h1>Contas Bancárias</h1>
          <p>{contas.length} conta(s).</p>
        </div>
        <div className="pn-head-actions">
          <Link to="/painel/financeiro" className="pn-btn-sm" prefetch="intent">Voltar</Link>
          <Link to="?novo=1" className="pn-btn-sm mint" preventScrollReset><Plus size={14} /> Nova conta</Link>
        </div>
      </div>

      <div className="pn-card pn-table-wrap">
        {contas.length === 0 ? (
          <EmptyState icon={Landmark} title="Nenhuma conta bancária" description="Cadastre bancos, caixas e carteiras digitais." />
        ) : (
          <table className="pn-table">
            <thead>
              <tr><th>Nome</th><th>Tipo</th><th>Banco / Agência / Conta</th><th>Saldo inicial</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {contas.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.nome}</strong></td>
                  <td>{c.tipo}</td>
                  <td>{[c.banco, c.agencia, c.conta].filter(Boolean).join(" / ") || "—"}</td>
                  <td>{formatBRL(Number(c.saldo_inicial))}</td>
                  <td><StatusBadge tone={c.ativo ? "ok" : "muted"}>{c.ativo ? "Ativa" : "Inativa"}</StatusBadge></td>
                  <td className="pn-row-actions">
                    <Link to={`?editar=${c.id}`} className="pn-btn-link" preventScrollReset><Pencil size={12} /> Editar</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {aberto ? (
        <div className="pn-drawer-backdrop" role="dialog" aria-modal="true">
          <div className="pn-drawer">
            <div className="pn-drawer-head">
              <h3>{editando ? "Editar conta" : "Nova conta bancária"}</h3>
              <Link to="/painel/financeiro/contas-bancarias" className="pn-btn-link" preventScrollReset>Fechar</Link>
            </div>
            <Form method="post" replace>
              <input type="hidden" name="intent" value={editando ? "editar" : "criar"} />
              {editando ? <input type="hidden" name="id" value={editando.id} /> : null}
              <div className="pn-drawer-body">
                <div className="pn-field-row">
                  <div className="pn-field">
                    <label htmlFor="nome">Nome *</label>
                    <input id="nome" name="nome" required defaultValue={editando?.nome ?? ""} autoFocus />
                  </div>
                  <div className="pn-field">
                    <label htmlFor="tipo">Tipo *</label>
                    <select id="tipo" name="tipo" defaultValue={editando?.tipo ?? "banco"}>
                      <option value="banco">Banco</option>
                      <option value="caixa">Caixa</option>
                      <option value="cartao">Cartão</option>
                      <option value="digital">Digital</option>
                    </select>
                  </div>
                </div>
                <div className="pn-field-row">
                  <div className="pn-field"><label htmlFor="banco">Banco</label><input id="banco" name="banco" defaultValue={editando?.banco ?? ""} /></div>
                  <div className="pn-field"><label htmlFor="agencia">Agência</label><input id="agencia" name="agencia" defaultValue={editando?.agencia ?? ""} /></div>
                  <div className="pn-field"><label htmlFor="conta">Conta</label><input id="conta" name="conta" defaultValue={editando?.conta ?? ""} /></div>
                </div>
                <div className="pn-field-row">
                  <div className="pn-field">
                    <label htmlFor="saldo_inicial">Saldo inicial</label>
                    <input id="saldo_inicial" name="saldo_inicial" type="number" step="0.01" defaultValue={editando?.saldo_inicial ?? "0"} />
                  </div>
                  <div className="pn-field">
                    <label className="pn-check" htmlFor="ativo">
                      <input id="ativo" type="checkbox" name="ativo" value="1" defaultChecked={editando ? editando.ativo : true} /> Ativa
                    </label>
                  </div>
                </div>
              </div>
              <div className="pn-drawer-foot">
                <Link to="/painel/financeiro/contas-bancarias" className="pn-btn-sm" preventScrollReset>Cancelar</Link>
                <button type="submit" className="pn-btn-sm mint" disabled={enviando}>{enviando ? "Salvando…" : "Salvar"}</button>
              </div>
            </Form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
