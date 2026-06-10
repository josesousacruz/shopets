import type { ActionFunctionArgs, LinksFunction, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { forgotPassword, ApiValidationError } from "~/lib/auth.server";
import contaStyles from "~/styles/conta.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: contaStyles }];

export const meta: MetaFunction = () => [{ title: "Recuperar senha — Shopets" }];

const MSG = "Se o e-mail existir em nossa base, enviamos um link para redefinir a senha.";

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  try {
    await forgotPassword(email);
  } catch (err) {
    // 422 (e-mail inválido) ou outros: mantemos a mensagem genérica por segurança.
    if (!(err instanceof ApiValidationError)) throw err;
  }
  return json({ ok: true });
}

export default function EsqueciSenha() {
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const submitting = nav.state === "submitting";

  return (
    <div className="ct-auth">
      <div className="ct-card">
        <h1>Recuperar senha</h1>
        <p className="sub">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>

        {actionData?.ok && (
          <div className="ct-alert ct-alert--ok" role="status">{MSG}</div>
        )}

        <Form method="post" noValidate>
          <div className="ct-field">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>

          <button type="submit" className="ct-btn ct-btn--mint" style={{ marginTop: 24 }} disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar link"}
          </button>
        </Form>

        <div className="ct-links">
          <Link to="/login">Voltar para entrar</Link>
        </div>
      </div>
    </div>
  );
}
