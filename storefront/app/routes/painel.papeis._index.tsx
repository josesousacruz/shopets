import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { Plus, Shield } from "lucide-react";
import { EmptyState } from "~/components/painel/EmptyState";
import { StatusBadge } from "~/components/painel/StatusBadge";
import { useActionFeedback, useFlashFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { drawerShouldRevalidate } from "~/lib/drawer-revalidate";
import { painel, PainelValidationError } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Papéis e Permissões — Painel Shopets" }];

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const url = new URL(req.url);

  const [papeis, perms] = await Promise.all([painel.papeis.list(token), painel.papeis.permissoes(token)]);

  const editarId = url.searchParams.get("editar");
  const editando = editarId ? (await painel.papeis.show(token, editarId)).data : null;

  return json({ papeis: papeis.data, permissoesPorModulo: perms.data, editando });
}

/**
 * Abrir/fechar o drawer ?novo=1 não refaz a listagem — abre instantâneo.
 * `editar` NÃO está listado: o loader busca o detalhe do papel (permissions)
 * via papeis.show, dado que não existe na listagem, então ?editar= continua
 * revalidando normalmente.
 */
export const shouldRevalidate = drawerShouldRevalidate(["novo"]);

export async function action({ request: req }: ActionFunctionArgs) {
  const { token } = await requireAdmin(req);
  const fd = await req.formData();
  const intent = String(fd.get("intent") ?? "");
  const nome = String(fd.get("nome") ?? "").trim();
  const permissions = fd.getAll("permissions").map(String);

  try {
    if (intent === "criar") {
      await painel.papeis.create(token, { nome, permissions });
    } else if (intent === "editar") {
      await painel.papeis.update(token, String(fd.get("id")), { nome, permissions });
    } else if (intent === "excluir") {
      await painel.papeis.destroy(token, String(fd.get("id")));
      return redirect("/painel/papeis?feedback=excluir");
    } else {
      return json({ erro: "Operação desconhecida." }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof PainelValidationError) return json({ erro: e.message }, { status: e.status });
    return json({ erro: "Falha ao salvar papel." }, { status: 500 });
  }
  return redirect(`/painel/papeis?feedback=${intent === "criar" ? "criar" : "editar"}`);
}

export default function Papeis() {
  const { papeis, permissoesPorModulo, editando } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  useActionFeedback(actionData);
  useFlashFeedback();

  const aberto = editando || searchParams.get("novo") === "1";
  const [marcados, setMarcados] = useState<Set<string>>(new Set(editando?.permissions ?? []));

  const toggle = (perm: string) =>
    setMarcados((prev) => {
      const next = new Set(prev);
      next.has(perm) ? next.delete(perm) : next.add(perm);
      return next;
    });
  const toggleModulo = (perms: string[], todos: boolean) =>
    setMarcados((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => (todos ? next.delete(p) : next.add(p)));
      return next;
    });

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Sistema</span>
          <h1>Papéis e Permissões</h1>
          <p>{papeis.length} papel(éis).</p>
        </div>
        <div className="pn-head-actions">
          <Link to="?novo=1" className="pn-btn-sm mint" preventScrollReset><Plus size={14} /> Novo papel</Link>
        </div>
      </div>

      <div className="pn-card pn-table-wrap">
        {papeis.length === 0 ? (
          <EmptyState icon={Shield} title="Nenhum papel" description="Crie papéis para controlar o acesso da equipe." />
        ) : (
          <table className="pn-table">
            <thead><tr><th>Papel</th><th>Permissões</th><th></th></tr></thead>
            <tbody>
              {papeis.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.nome}</strong>
                    {p.sistema ? <StatusBadge tone="info">Sistema</StatusBadge> : null}
                  </td>
                  <td>{p.permissions_count}</td>
                  <td className="pn-row-actions">
                    {!p.sistema ? (
                      <>
                        <Link to={`?editar=${p.id}`} className="pn-btn-link" preventScrollReset>Editar</Link>
                        <Form method="post" replace style={{ display: "inline" }}>
                          <input type="hidden" name="intent" value="excluir" />
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className="pn-btn-link">Excluir</button>
                        </Form>
                      </>
                    ) : <span className="pn-list-meta">protegido</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {aberto ? (
        <div className="pn-drawer-backdrop" role="dialog" aria-modal="true">
          <div className="pn-drawer pn-drawer-lg">
            <div className="pn-drawer-head">
              <h3>{editando ? `Editar papel: ${editando.nome}` : "Novo papel"}</h3>
              <Link to="/painel/papeis" className="pn-btn-link" preventScrollReset>Fechar</Link>
            </div>
            <Form method="post" replace>
              <input type="hidden" name="intent" value={editando ? "editar" : "criar"} />
              {editando ? <input type="hidden" name="id" value={editando.id} /> : null}
              {[...marcados].map((p) => <input key={p} type="hidden" name="permissions" value={p} />)}
              <div className="pn-drawer-body">
                <div className="pn-field">
                  <label htmlFor="nome">Nome do papel *</label>
                  <input id="nome" name="nome" required defaultValue={editando?.nome ?? ""} autoFocus />
                </div>
                <div className="pn-matrix">
                  {Object.entries(permissoesPorModulo).map(([modulo, perms]) => {
                    const todos = perms.every((p) => marcados.has(p));
                    return (
                      <div className="pn-matrix-modulo" key={modulo}>
                        <div className="pn-matrix-head">
                          <strong>{modulo}</strong>
                          <button type="button" className="pn-btn-link" onClick={() => toggleModulo(perms, todos)}>
                            {todos ? "Desmarcar tudo" : "Marcar tudo"}
                          </button>
                        </div>
                        <div className="pn-matrix-acoes">
                          {perms.map((perm) => (
                            <label key={perm} className="pn-check">
                              <input type="checkbox" checked={marcados.has(perm)} onChange={() => toggle(perm)} />
                              {perm.split(".").slice(2).join(".") || perm}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="pn-drawer-foot">
                <Link to="/painel/papeis" className="pn-btn-sm" preventScrollReset>Cancelar</Link>
                <button type="submit" className="pn-btn-sm mint" disabled={enviando}>{enviando ? "Salvando…" : "Salvar papel"}</button>
              </div>
            </Form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
