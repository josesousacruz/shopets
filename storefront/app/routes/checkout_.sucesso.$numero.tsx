import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Check, Clock, Package, ShoppingBag, Store } from "lucide-react";
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
  // Dados da loja para a retirada com pagamento no balcão (vêm do checkout).
  const url = new URL(request.url);
  const lojaNome = url.searchParams.get("loja");
  const lojaEndereco = url.searchParams.get("end");
  return json({ numero, pedido, lojaNome, lojaEndereco });
}

export default function CheckoutSucesso() {
  const { numero, pedido, lojaNome, lojaEndereco } = useLoaderData<typeof loader>();

  // Retirada com pagamento no balcão: pedido reservado, sem pagamento online.
  const reservadoRetirada =
    pedido?.status === "aguardando_retirada" ||
    (pedido?.modalidade === "retirada" && pedido?.status !== "aguardando_pagamento" && !!lojaNome);

  const pago =
    !reservadoRetirada &&
    pedido != null &&
    pedido.status !== "aguardando_pagamento" &&
    pedido.status !== "cancelado";
  const pendente = !reservadoRetirada && (!pedido || pedido.status === "aguardando_pagamento");
  const statusLabel = pedido ? STATUS_LABEL[pedido.status] ?? pedido.status : "Aguardando pagamento";

  if (reservadoRetirada) {
    return (
      <div className="co-success">
        <div className="seal">
          <Store />
        </div>
        <h1>Pedido reservado!</h1>
        <p className="lead">
          {lojaNome
            ? `Retire na loja ${lojaNome} e pague no balcão.`
            : "Retire na loja escolhida e pague no balcão."}
        </p>

        <div className="numero">
          <Package size={16} /> Nº {numero}
        </div>
        <div>
          <span className="status-pill">
            <span className="d" /> {statusLabel}
          </span>
        </div>

        {(lojaNome || lojaEndereco) && (
          <div className="panel" style={{ textAlign: "left" }}>
            <h3>Onde retirar</h3>
            <div style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.6 }}>
              {lojaNome && <strong style={{ display: "block" }}>{lojaNome}</strong>}
              {lojaEndereco}
            </div>
          </div>
        )}

        <div className="co-note" style={{ maxWidth: 480, margin: "20px auto 0", textAlign: "left" }}>
          <strong>Como funciona:</strong> separamos seus itens e avisaremos quando o pedido estiver
          pronto. Vá até a loja, informe o número do pedido e pague no balcão (Pix, cartão ou
          dinheiro). A reserva fica válida por tempo limitado.
        </div>

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
