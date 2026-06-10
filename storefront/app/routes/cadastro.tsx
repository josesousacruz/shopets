import type { ActionFunctionArgs, LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { register, ApiValidationError } from "~/lib/auth.server";
import { createUserSession, getToken } from "~/lib/session.server";
import contaStyles from "~/styles/conta.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: contaStyles }];

export const meta: MetaFunction = () => [{ title: "Criar conta — Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  if (await getToken(request)) return redirect("/conta");
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const nome = String(form.get("nome") ?? "");
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const password_confirmation = String(form.get("password_confirmation") ?? "");
  const aceita_marketing = form.get("aceita_marketing") === "on";

  try {
    const { token } = await register({ nome, email, password, password_confirmation, aceita_marketing });
    return await createUserSession(token, "/conta");
  } catch (err) {
    if (err instanceof ApiValidationError) {
      return json(
        { errors: err.errors, message: err.message, values: { nome, email, aceita_marketing } },
        { status: 422 },
      );
    }
    throw err;
  }
}

export default function Cadastro() {
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const submitting = nav.state === "submitting";
  const errors = actionData?.errors ?? {};
  const v = actionData?.values;

  return (
    <div className="ct-auth">
      <div className="ct-card">
        <h1>Criar conta</h1>
        <p className="sub">Leva menos de um minuto e agiliza suas próximas compras.</p>

        {actionData?.message && Object.keys(errors).length === 0 && (
          <div className="ct-alert ct-alert--err" role="alert">{actionData.message}</div>
        )}

        <Form method="post" noValidate>
          <div className="ct-field">
            <label htmlFor="nome">Nome completo</label>
            <input id="nome" name="nome" type="text" autoComplete="name" required
              defaultValue={v?.nome}
              aria-invalid={errors.nome ? true : undefined}
              aria-describedby={errors.nome ? "nome-err" : undefined} />
            {errors.nome && <span className="err" id="nome-err">{errors.nome[0]}</span>}
          </div>

          <div className="ct-field">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" autoComplete="email" required
              defaultValue={v?.email}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "email-err" : undefined} />
            {errors.email && <span className="err" id="email-err">{errors.email[0]}</span>}
          </div>

          <div className="ct-field">
            <label htmlFor="password">Senha</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "password-err" : undefined} />
            {errors.password && <span className="err" id="password-err">{errors.password[0]}</span>}
          </div>

          <div className="ct-field">
            <label htmlFor="password_confirmation">Confirmar senha</label>
            <input id="password_confirmation" name="password_confirmation" type="password" autoComplete="new-password" required
              aria-invalid={errors.password_confirmation ? true : undefined}
              aria-describedby={errors.password_confirmation ? "pwc-err" : undefined} />
            {errors.password_confirmation && <span className="err" id="pwc-err">{errors.password_confirmation[0]}</span>}
          </div>

          <div className="ct-field--inline">
            <input id="aceita_marketing" name="aceita_marketing" type="checkbox" defaultChecked={v?.aceita_marketing} />
            <label htmlFor="aceita_marketing">Quero receber ofertas e novidades por e-mail</label>
          </div>

          <button type="submit" className="ct-btn ct-btn--mint" style={{ marginTop: 24 }} disabled={submitting}>
            {submitting ? "Criando..." : "Criar conta"}
          </button>
        </Form>

        <div className="ct-links">
          <span className="muted">
            Já tem conta? <Link to="/login">Entrar</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
