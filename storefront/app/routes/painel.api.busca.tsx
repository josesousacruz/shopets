import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAdmin } from "~/lib/admin-session.server";
import { painel } from "~/lib/painel.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAdmin(request);
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const res = await painel.busca(token, q);
  return json(res);
}
