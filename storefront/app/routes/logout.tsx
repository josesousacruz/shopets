import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { logoutApi } from "~/lib/auth.server";
import { getToken, logout } from "~/lib/session.server";

export async function action({ request }: ActionFunctionArgs) {
  const token = await getToken(request);
  if (token) {
    // Revoga o token na API; ignora falhas para sempre limpar a sessão local.
    await logoutApi(token).catch(() => {});
  }
  return logout(request, "/");
}

// Acesso direto via GET apenas redireciona.
export async function loader() {
  return redirect("/");
}
