import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { serializePdvAtivo } from "~/lib/pdv-context.server";

/**
 * Atualiza o cookie do PDV ativo do painel.
 * Body: form-data { id: "all" | "<numero>" }.
 * Redireciona de volta para a tela anterior preservando o estado.
 */
export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const raw = form.get("id");
  const id = !raw || raw === "all" ? null : Number(raw);

  const cookie = await serializePdvAtivo(Number.isFinite(id as number) ? (id as number) : null);
  const back = request.headers.get("Referer") ?? "/painel";

  return redirect(back, { headers: { "Set-Cookie": cookie } });
}
