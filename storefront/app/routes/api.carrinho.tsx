import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  adicionarItem,
  atualizarItem,
  removerItem,
  fetchCarrinho,
} from "~/lib/cart.server";
import { ApiValidationError } from "~/lib/auth.server";
import type { Carrinho } from "~/types/api";

/** GET /api/carrinho — devolve o carrinho atual (para o drawer hidratar). */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { carrinho, setCookie } = await fetchCarrinho(request);
    return json(
      { ok: true as const, carrinho },
      setCookie ? { headers: { "Set-Cookie": setCookie } } : undefined,
    );
  } catch {
    return json({ ok: false as const, carrinho: null });
  }
}

/**
 * POST /api/carrinho — mutações por intent: add | update | remove.
 * Sempre devolve o carrinho atualizado. Erros de estoque (422) viram
 * `{ ok:false, message, errors }` para o cliente exibir.
 */
export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  try {
    let res: { data: Carrinho };

    if (intent === "add") {
      const id_produto = Number(form.get("id_produto"));
      const id_variacaoRaw = form.get("id_variacao");
      const id_variacao =
        id_variacaoRaw && String(id_variacaoRaw).length > 0 ? Number(id_variacaoRaw) : null;
      const quantidade = Number(form.get("quantidade") ?? 1) || 1;
      res = await adicionarItem(request, { id_produto, id_variacao, quantidade });
    } else if (intent === "update") {
      const id = Number(form.get("id"));
      const quantidade = Number(form.get("quantidade") ?? 1) || 1;
      res = await atualizarItem(request, id, quantidade);
    } else if (intent === "remove") {
      const id = Number(form.get("id"));
      res = await removerItem(request, id);
    } else {
      return json({ ok: false as const, message: "Ação inválida." }, { status: 400 });
    }

    return json({ ok: true as const, intent, carrinho: res.data });
  } catch (err) {
    if (err instanceof ApiValidationError) {
      const message =
        err.errors.quantidade?.[0] ??
        err.errors.id_produto?.[0] ??
        err.message ??
        "Não foi possível atualizar o carrinho.";
      return json(
        { ok: false as const, intent, message, errors: err.errors },
        { status: err.status === 422 ? 422 : 400 },
      );
    }
    throw err;
  }
}
