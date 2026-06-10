import type { ActionFunctionArgs, LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { resetPassword, ApiValidationError } from "~/lib/auth.server";
import contaStyles from "~/styles/conta.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: contaStyles }];

export const meta: MetaFunction = () => [{ title: "Redefinir senha — Shopets" }];

export async function loader({ params, request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  return json({ token: params.token ?? "", email: url.searchParams.get("email") ?? "" });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const form = await request.formData();
  const token = params.token ?? "";
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const password_confirmation = String(form.get("password_confirmation") ?? "");

  try {
    await resetPassword({ token, email, password, password_confirmation });
    return redirect("/login?redefinida=1");
  } catch (err) {
    if (err instanceof ApiValidationError) {
      return json({ errors: err.errors, message: err.message }, { status: 422 });
    }
    throw err;
  }
}

export default function RedefinirSenha() {
  const { email } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const submitting = nav.state === "submitting";
  const errors = actionData?.errors ?? {};

  return (
    <div className="ct-auth">
      <div className="ct-card">
        <h1>Redefinir senha</h1>
        <p className="sub">Escolha uma nova senha para sua conta.</p>

        {actionData?.message && (
          <div className="ct-alert ct-alert--err" role="alert">{actionData.message}</div>
        )}

        <Form method="post" noValidate>
          <div className="ct-field">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" autoComplete="email" required
              defaultValue={email} readOnly={!!email}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "email-err" : undefined} />
            {errors.email && <span className="err" id="email-err">{errors.email[0]}</span>}
          </div>

          <div className="ct-field">
            <label htmlFor="password">Nova senha</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "password-err" : undefined} />
            {errors.password && <span className="err" id="password-err">{errors.password[0]}</span>}
          </div>

          <div className="ct-field">
            <label htmlFor="password_confirmation">Confirmar nova senha</label>
            <input id="password_confirmation" name="password_confirmation" type="password" autoComplete="new-password" required
              aria-invalid={errors.password_confirmation ? true : undefined}
              aria-describedby={errors.password_confirmation ? "pwc-err" : undefined} />
            {errors.password_confirmation && <span className="err" id="pwc-err">{errors.password_confirmation[0]}</span>}
          </div>

          <button type="submit" className="ct-btn ct-btn--mint" style={{ marginTop: 24 }} disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar nova senha"}
          </button>
        </Form>

        <div className="ct-links">
          <Link to="/login">Voltar para entrar</Link>
        </div>
      </div>
    </div>
  );
}
