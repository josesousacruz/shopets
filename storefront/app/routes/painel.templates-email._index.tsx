import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { Eye, Mail, Plus } from "lucide-react";
import { EmptyState } from "~/components/painel/EmptyState";
import { StatusBadge } from "~/components/painel/StatusBadge";
import { useActionFeedback, useFlashFeedback } from "~/hooks/use-action-feedback";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel, PainelValidationError } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Templates de E-mail — Painel Shopets" }];

export async function loader({ request: req }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(req);
  const url = new URL(req.url);
  const lista = await painel.templatesEmail.list(token);

  const editarId = url.searchParams.get("editar");
  const editando = editarId ? lista.data.find((t) => String(t.id) === editarId) ?? null : null;

  const previewId = url.searchParams.get("preview");
  const preview = previewId ? (await painel.templatesEmail.preview(token, previewId)).data : null;

  return json({ templates: lista.data, editando, preview });
}

export async function action({ request: req }: ActionFunctionArgs) {
  const { token } = await requireAdmin(req);
  const fd = await req.formData();
  const intent = String(fd.get("intent") ?? "");
  const body = {
    slug: String(fd.get("slug") ?? "").trim(),
    nome: String(fd.get("nome") ?? "").trim(),
    assunto: String(fd.get("assunto") ?? "").trim(),
    corpo_html: String(fd.get("corpo_html") ?? ""),
    ativo: fd.get("ativo") === "1",
  };

  try {
    if (intent === "criar") await painel.templatesEmail.create(token, body);
    else if (intent === "editar") await painel.templatesEmail.update(token, String(fd.get("id")), body);
    else if (intent === "excluir") {
      await painel.templatesEmail.destroy(token, String(fd.get("id")));
      return redirect("/painel/templates-email?feedback=excluir");
    } else return json({ erro: "Operação desconhecida." }, { status: 400 });
  } catch (e) {
    if (e instanceof PainelValidationError) return json({ erro: e.message }, { status: e.status });
    return json({ erro: "Falha ao salvar template." }, { status: 500 });
  }
  return redirect(`/painel/templates-email?feedback=${intent === "criar" ? "criar" : "editar"}`);
}

export default function TemplatesEmail() {
  const { templates, editando, preview } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const nav = useNavigation();
  const enviando = nav.state === "submitting";
  useActionFeedback(actionData);
  useFlashFeedback();

  const aberto = editando || searchParams.get("novo") === "1";

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Sistema</span>
          <h1>Templates de E-mail</h1>
          <p>{templates.length} template(s).</p>
        </div>
        <div className="pn-head-actions">
          <Link to="?novo=1" className="pn-btn-sm mint" preventScrollReset><Plus size={14} /> Novo template</Link>
        </div>
      </div>

      <div className="pn-card pn-table-wrap">
        {templates.length === 0 ? (
          <EmptyState icon={Mail} title="Nenhum template" description="Crie modelos de e-mail transacional com variáveis {{...}}." />
        ) : (
          <table className="pn-table">
            <thead><tr><th>Nome</th><th>Slug</th><th>Assunto</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td><strong>{t.nome}</strong></td>
                  <td><code>{t.slug}</code></td>
                  <td>{t.assunto}</td>
                  <td><StatusBadge tone={t.ativo ? "ok" : "muted"}>{t.ativo ? "Ativo" : "Inativo"}</StatusBadge></td>
                  <td className="pn-row-actions">
                    <Link to={`?preview=${t.id}`} className="pn-btn-link" preventScrollReset><Eye size={12} /> Preview</Link>
                    <Link to={`?editar=${t.id}`} className="pn-btn-link" preventScrollReset>Editar</Link>
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
              <h3>{editando ? "Editar template" : "Novo template"}</h3>
              <Link to="/painel/templates-email" className="pn-btn-link" preventScrollReset>Fechar</Link>
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
                    <label htmlFor="slug">Slug *</label>
                    <input id="slug" name="slug" required defaultValue={editando?.slug ?? ""} placeholder="pedido_enviado" />
                  </div>
                </div>
                <div className="pn-field">
                  <label htmlFor="assunto">Assunto *</label>
                  <input id="assunto" name="assunto" required defaultValue={editando?.assunto ?? ""} />
                </div>
                <div className="pn-field">
                  <label htmlFor="corpo_html">Corpo (HTML) *</label>
                  <textarea id="corpo_html" name="corpo_html" rows={8} required defaultValue={editando?.corpo_html ?? ""} />
                  <span className="pn-list-meta">Use variáveis: {"{{numero}} {{cliente}} {{total}} {{rastreio}} {{loja}}"}</span>
                </div>
                <label className="pn-check">
                  <input type="checkbox" name="ativo" value="1" defaultChecked={editando ? editando.ativo : true} /> Ativo
                </label>
              </div>
              <div className="pn-drawer-foot">
                <Link to="/painel/templates-email" className="pn-btn-sm" preventScrollReset>Cancelar</Link>
                <button type="submit" className="pn-btn-sm mint" disabled={enviando}>{enviando ? "Salvando…" : "Salvar"}</button>
              </div>
            </Form>
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="pn-drawer-backdrop" role="dialog" aria-modal="true">
          <div className="pn-drawer pn-drawer-lg">
            <div className="pn-drawer-head">
              <h3>Preview (dados de exemplo)</h3>
              <Link to="/painel/templates-email" className="pn-btn-link" preventScrollReset>Fechar</Link>
            </div>
            <div className="pn-drawer-body">
              <p><strong>Assunto:</strong> {preview.assunto}</p>
              <div className="pn-email-preview" dangerouslySetInnerHTML={{ __html: preview.corpo_html }} />
            </div>
            <div className="pn-drawer-foot">
              <Link to="/painel/templates-email" className="pn-btn-sm" preventScrollReset>Fechar</Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
