import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useFetcher, useLoaderData } from "@remix-run/react";
import { Trash2 } from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel, PainelValidationError, type CategoriaAdmin } from "~/lib/painel.server";

export const meta: MetaFunction = () => [{ title: "Categorias — Painel Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const res = await painel.categorias.list(token);
  return json({ categorias: res.data });
}

export async function action({ request }: ActionFunctionArgs) {
  const { token } = await requireAdmin(request);
  const form = await request.formData();
  const intent = String(form.get("_intent") ?? "");

  const payload = () => ({
    nome: String(form.get("nome") ?? ""),
    ordem: form.get("ordem") ? Number(form.get("ordem")) : 0,
    visivel_ecommerce: form.get("visivel_ecommerce") === "true",
    id_categoria_pai: form.get("id_categoria_pai") ? Number(form.get("id_categoria_pai")) : null,
    descricao_seo: String(form.get("descricao_seo") ?? "") || null,
  });

  try {
    switch (intent) {
      case "create":
        await painel.categorias.create(token, payload());
        return json({ ok: "create" });
      case "update":
        await painel.categorias.update(token, String(form.get("id")), payload());
        return json({ ok: "update" });
      case "delete":
        await painel.categorias.remove(token, String(form.get("id")));
        return json({ ok: "delete" });
      default:
        return json({ erro: "Ação inválida." }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof PainelValidationError) {
      return json({ erro: err.message, errors: err.errors, intent }, { status: 422 });
    }
    throw err;
  }
}

function LinhaCategoria({ c, todas }: { c: CategoriaAdmin; todas: CategoriaAdmin[] }) {
  const fetcher = useFetcher<typeof action>();
  const busy = fetcher.state !== "idle";
  return (
    <fetcher.Form method="post" className="pn-var-row" style={{ gridTemplateColumns: "1.4fr 1fr 0.6fr auto auto auto" }}>
      <input type="hidden" name="id" value={c.id} />
      <input name="nome" defaultValue={c.nome} required placeholder="Nome" />
      <select name="id_categoria_pai" defaultValue={c.id_categoria_pai ?? ""}>
        <option value="">— sem pai —</option>
        {todas
          .filter((o) => o.id !== c.id)
          .map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
      </select>
      <input name="ordem" type="number" min="0" defaultValue={c.ordem} placeholder="Ordem" />
      <label className="pn-switch" title="Visível na loja">
        <input type="checkbox" name="visivel_ecommerce" value="true" defaultChecked={c.visivel_ecommerce} />
        <span className="track" />
      </label>
      <button type="submit" name="_intent" value="update" className="pn-btn-sm ghost" disabled={busy}>
        Salvar
      </button>
      <button
        type="submit"
        name="_intent"
        value="delete"
        className="pn-btn-sm danger"
        disabled={busy}
        onClick={(e) => {
          if (!window.confirm(`Excluir a categoria "${c.nome}"?`)) e.preventDefault();
        }}
      >
        <Trash2 size={14} />
      </button>
    </fetcher.Form>
  );
}

export default function Categorias() {
  const { categorias } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div>
      <div className="pn-head">
        <div>
          <span className="eye">Organização</span>
          <h1>Categorias</h1>
          <p>O slug é gerado automaticamente a partir do nome.</p>
        </div>
      </div>

      {actionData && "erro" in actionData && actionData.erro && (
        <div className="ct-alert ct-alert--err" role="alert" style={{ marginBottom: 18 }}>
          {actionData.erro}
        </div>
      )}

      <div className="pn-card">
        <h2>Categorias cadastradas</h2>
        {categorias.length === 0 ? (
          <p className="card-sub">Nenhuma categoria.</p>
        ) : (
          <div style={{ marginTop: 12 }}>
            <div
              className="pn-var-row"
              style={{
                gridTemplateColumns: "1.4fr 1fr 0.6fr auto auto auto",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
              }}
            >
              <span>Nome</span>
              <span>Categoria pai</span>
              <span>Ordem</span>
              <span>Loja</span>
              <span></span>
              <span></span>
            </div>
            {categorias.map((c) => (
              <LinhaCategoria key={c.id} c={c} todas={categorias} />
            ))}
          </div>
        )}
      </div>

      <div className="pn-card">
        <h2>Nova categoria</h2>
        <Form method="post" className="pn-var-row" style={{ gridTemplateColumns: "1.4fr 1fr 0.6fr auto auto" }}>
          <input type="hidden" name="_intent" value="create" />
          <input name="nome" placeholder="Nome *" required />
          <select name="id_categoria_pai" defaultValue="">
            <option value="">— sem pai —</option>
            {categorias.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
          <input name="ordem" type="number" min="0" placeholder="Ordem" defaultValue={0} />
          <label className="pn-switch" title="Visível na loja">
            <input type="checkbox" name="visivel_ecommerce" value="true" defaultChecked />
            <span className="track" />
          </label>
          <button type="submit" className="pn-btn-sm mint">
            Adicionar
          </button>
        </Form>
      </div>
    </div>
  );
}
