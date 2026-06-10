import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireToken } from "~/lib/session.server";
import { obterPedido } from "~/lib/cart.server";
import { ApiValidationError } from "~/lib/auth.server";

/** Endpoint leve usado pelo polling da etapa de pagamento. */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = await requireToken(request, "/conta/pedidos");
  const numero = params.numero!;
  try {
    const { data: pedido } = await obterPedido(token, numero);
    return json({ pedido });
  } catch (err) {
    if (err instanceof ApiValidationError && err.status === 404) {
      throw new Response("Pedido não encontrado", { status: 404 });
    }
    throw err;
  }
}
