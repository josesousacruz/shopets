import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Check, Clock, Package, ShoppingBag } from "lucide-react";
import { requireToken } from "~/lib/session.server";
import { obterPedido } from "~/lib/cart.server";
import { ApiValidationError } from "~/lib/auth.server";
import { formatBRL } from "~/lib/format";
import { STATUS_LABEL } from "~/lib/pedido";
import type { Pedido } from "~/types/api";
import checkoutStyles from "~/styles/checkout.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: checkoutStyles }];

export const meta: MetaFunction = () => [{ title: "Pedido criado — Shopets" }];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = await requireToken(request, "/conta/pedidos");
  const numero = params.numero!;
  let pedido: Pedido | null = null;
  try {
    const r = await obterPedido(token, numero);
    pedido = r.data;
  } catch (err) {
    if (!(err instanceof ApiValidationError)) throw err;
    pedido = null;
  }
  return json({ numero, pedido });
}

export default function CheckoutSucesso() {
  const { numero, pedido } = useLoaderData<typeof loader>();

  const pago = pedido != null && pedido.status !== "aguardando_pagamento" && pedido.status !== "cancelado";
  const pendente = !pedido || pedido.status === "aguardando_pagamento";
  const statusLabel = pedido ? STATUS_LABEL[pedido.status] ?? pedido.status : "Aguardando pagamento";

  return (
    <div className="co-success">
      <div className="seal" style={pendente ? { background: "var(--mint)" } : undefined}>
        {pendente ? <Clock /> : <Check />}
      </div>
      <h1>{pago ? "Pagamento confirmado!" : "Pedido criado!"}</h1>
      <p className="lead">
        {pago
          ? "Seu pagamento foi aprovado e seu pedido já está a caminho."
          : "Recebemos seu pedido. Conclua o pagamento para que ele seja processado."}
      </p>

      <div className="numero">
        <Package size={16} /> Nº {numero}
      </div>
      <div>
        <span className="status-pill">
          <span className="d" /> {statusLabel}
        </span>
      </div>

      {pendente && (
        <div className="co-note" style={{ maxWidth: 460, margin: "20px auto 0", textAlign: "left" }}>
          Ainda não recebemos o pagamento.{" "}
          <Link to={`/checkout/pagamento/${encodeURIComponent(numero)}`} style={{ color: "var(--mint-deep)", fontWeight: 700 }}>
            Pagar agora
          </Link>
          .
        </div>
      )}

      {pedido && (
        <div className="panel">
          <h3>Resumo do pedido</h3>
          <div className="co-rows">
            <div className="row">
              <span>Subtotal</span>
              <b>{formatBRL(pedido.subtotal)}</b>
            </div>
            <div className="row">
              <span>Frete{pedido.frete_servico ? ` (${pedido.frete_servico})` : ""}</span>
              <b>{formatBRL(pedido.frete)}</b>
            </div>
            {pedido.desconto > 0 && (
              <div className="row">
                <span>Desconto</span>
                <b>-{formatBRL(pedido.desconto)}</b>
              </div>
            )}
            <div className="row total">
              <span>Total</span>
              <b>{formatBRL(pedido.total)}</b>
            </div>
          </div>
        </div>
      )}

      <div className="btns">
        <Link to="/conta/pedidos" className="ct-btn ct-btn--mint" style={{ width: "auto" }}>
          <Package size={16} /> Meus pedidos
        </Link>
        <Link to="/loja" className="ct-btn ct-btn--ghost" style={{ width: "auto" }}>
          <ShoppingBag size={16} /> Continuar comprando
        </Link>
      </div>
    </div>
  );
}
