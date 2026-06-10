import type { ActionFunctionArgs, LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation, useSearchParams } from "@remix-run/react";
import { login, ApiValidationError } from "~/lib/auth.server";
import { createUserSession, getToken } from "~/lib/session.server";
import contaStyles from "~/styles/conta.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: contaStyles }];

export const meta: MetaFunction = () => [{ title: "Entrar — Shopets" }];

function safeRedirect(to: FormDataEntryValue | null): string {
  if (typeof to === "string" && to.startsWith("/") && !to.startsWith("//")) return to;
  return "/conta";
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (await getToken(request)) return redirect("/conta");
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const redirectTo = safeRedirect(form.get("redirectTo"));

  try {
    const { token } = await login({ email, password });
    return await createUserSession(token, redirectTo);
  } catch (err) {
    if (err instanceof ApiValidationError) {
      return json(
        { errors: err.errors, message: err.message, values: { email } },
        { status: 422 },
      );
    }
    throw err;
  }
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const [params] = useSearchParams();
  const redirectTo = params.get("redirectTo") ?? "/conta";
  const submitting = nav.state === "submitting";
  const errors = actionData?.errors ?? {};

  return (
    <div className="ct-auth">
      <div className="ct-card">
        <h1>Entrar</h1>
        <p className="sub">Acesse sua conta para acompanhar pedidos e endereços.</p>

        {actionData?.message && (
          <div className="ct-alert ct-alert--err" role="alert">
            {actionData.message}
          </div>
        )}

        <Form method="post" noValidate>
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <div className="ct-field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={actionData?.values?.email}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "email-err" : undefined}
            />
            {errors.email && <span className="err" id="email-err">{errors.email[0]}</span>}
          </div>

          <div className="ct-field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "password-err" : undefined}
            />
            {errors.password && <span className="err" id="password-err">{errors.password[0]}</span>}
          </div>

          <button type="submit" className="ct-btn ct-btn--mint" style={{ marginTop: 24 }} disabled={submitting}>
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </Form>

        <div className="ct-links">
          <Link to="/esqueci-senha">Esqueci minha senha</Link>
          <span className="muted">
            Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
