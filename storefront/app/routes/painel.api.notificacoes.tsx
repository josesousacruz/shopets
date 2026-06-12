import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const url = new URL(request.url);
  const unread = url.searchParams.get("unread") === "1";
  const res = await painel.notificacoes.list(token, { unread, page: 1 });
  return json(res);
}

export async function action({ request }: ActionFunctionArgs) {
  const { token } = await requireAdmin(request);
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");

  if (intent === "marcar-todas") {
    await painel.notificacoes.marcarTodasLidas(token);
    return json({ ok: true });
  }

  const id = url.searchParams.get("id");
  if (intent === "marcar-lida" && id) {
    await painel.notificacoes.marcarLida(token, id);
    return json({ ok: true });
  }

  return json({ error: "intent inválido" }, { status: 400 });
}
