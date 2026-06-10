import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useNavigation, useSearchParams } from "@remix-run/react";
import { painel, PainelValidationError } from "~/lib/painel.server";
import { createAdminSession, getAdminToken } from "~/lib/admin-session.server";
import contaStyles from "~/styles/conta.css?url";
import painelStyles from "~/styles/painel.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: contaStyles },
  { rel: "stylesheet", href: painelStyles },
];

export const meta: MetaFunction = () => [{ title: "Painel do Lojista — Shopets" }];

function safeRedirect(to: FormDataEntryValue | null): string {
  if (typeof to === "string" && to.startsWith("/painel") && !to.startsWith("//")) return to;
  return "/painel";
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (await getAdminToken(request)) return redirect("/painel");
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const redirectTo = safeRedirect(form.get("redirectTo"));

  try {
    const { token } = await painel.auth.login({ email, password });
    return await createAdminSession(token, redirectTo);
  } catch (err) {
    if (err instanceof PainelValidationError) {
      return json(
        { errors: err.errors, message: err.message, values: { email } },
        { status: err.status === 422 ? 422 : 400 },
      );
    }
    throw err;
  }
}

export default function PainelLogin() {
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const [params] = useSearchParams();
  const redirectTo = params.get("redirectTo") ?? "/painel";
  const submitting = nav.state === "submitting";
  const errors = actionData?.errors ?? {};

  return (
    <div className="pn-login">
      <div className="card">
        <div className="brand">
          Shopets
          <small>Painel do Lojista</small>
        </div>
        <p className="sub" style={{ marginTop: 10 }}>
          Acesse com suas credenciais do PDV.
        </p>

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
            />
            {errors.email && <span className="err">{errors.email[0]}</span>}
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
            />
            {errors.password && <span className="err">{errors.password[0]}</span>}
          </div>

          <button
            type="submit"
            className="ct-btn ct-btn--mint"
            style={{ marginTop: 24 }}
            disabled={submitting}
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </Form>
      </div>
    </div>
  );
}
