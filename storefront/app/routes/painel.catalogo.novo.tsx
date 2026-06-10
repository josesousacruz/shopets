import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel, PainelValidationError } from "~/lib/painel.server";
import { ProdutoCampos, lerProdutoForm } from "~/components/painel/ProdutoCampos";

export const meta: MetaFunction = () => [{ title: "Novo produto — Painel Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const categorias = await painel.categorias.list(token);
  return json({ categorias: categorias.data });
}

export async function action({ request }: ActionFunctionArgs) {
  const { token } = await requireAdmin(request);
  const form = await request.formData();
  const payload = lerProdutoForm(form);

  try {
    const res = await painel.produtos.create(token, payload);
    // Vai para a edição para adicionar fotos e variações.
    return redirect(`/painel/catalogo/${res.data.id}`);
  } catch (err) {
    if (err instanceof PainelValidationError) {
      return json({ errors: err.errors, message: err.message }, { status: 422 });
    }
    throw err;
  }
}

export default function NovoProduto() {
  const { categorias } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const saving = nav.state === "submitting";

  return (
    <div>
      <div className="pn-head">
        <div>
          <Link to="/painel/catalogo" className="pn-btn-sm ghost" style={{ marginBottom: 10 }}>
            <ArrowLeft size={15} /> Catálogo
          </Link>
          <h1>Novo produto</h1>
          <p>Salve para depois adicionar fotos e variações.</p>
        </div>
      </div>

      {actionData?.message && (
        <div className="ct-alert ct-alert--err" role="alert" style={{ marginBottom: 18 }}>
          {actionData.message}
        </div>
      )}

      <Form method="post">
        <ProdutoCampos categorias={categorias} errors={actionData?.errors} />
        <div className="pn-actions-bar" style={{ marginTop: 18 }}>
          <button type="submit" className="pn-btn-sm mint" disabled={saving}>
            {saving ? "Salvando..." : "Criar produto"}
          </button>
          <Link to="/painel/catalogo" className="pn-btn-sm ghost">
            Cancelar
          </Link>
        </div>
      </Form>
    </div>
  );
}
