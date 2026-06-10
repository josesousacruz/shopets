import type { ActionFunctionArgs, LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useFetcher, useLoaderData } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, QrCode, ShieldCheck } from "lucide-react";
import { requireToken } from "~/lib/session.server";
import { obterPedido, pagarPedido, simularAprovacao } from "~/lib/cart.server";
import { ApiValidationError } from "~/lib/auth.server";
import { formatBRL } from "~/lib/format";
import type { PagamentoPix, Pedido } from "~/types/api";
import checkoutStyles from "~/styles/checkout.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: checkoutStyles }];

export const meta: MetaFunction = () => [{ title: "Pagamento — Shopets" }];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = await requireToken(request, "/conta/pedidos");
  const numero = params.numero!;

  let pedido: Pedido | null = null;
  try {
    const r = await obterPedido(token, numero);
    pedido = r.data;
  } catch (err) {
    if (err instanceof ApiValidationError && err.status === 404) {
      throw new Response("Pedido não encontrado", { status: 404 });
    }
    throw err;
  }

  // Pedido já pago: vai direto para o sucesso.
  if (pedido.status === "pago" || pedido.status === "em_separacao" || pedido.status === "enviado" || pedido.status === "entregue") {
    throw redirect(`/checkout/sucesso/${encodeURIComponent(numero)}`);
  }

  // Flag dev: mostra o botão "simular pagamento".
  const fake = process.env.NODE_ENV !== "production" || process.env.PUBLIC_PAYMENT_FAKE === "1";

  return json({ numero, pedido, fake });
}

type ActionResult =
  | { ok: true; intent: "pix"; pagamento: PagamentoPix }
  | { ok: true; intent: "simular" }
  | { ok: false; intent: string; message: string };

export async function action({ request, params }: ActionFunctionArgs) {
  const token = await requireToken(request, "/conta/pedidos");
  const numero = params.numero!;
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "pix") {
    try {
      const pagamento = await pagarPedido(token, numero, "pix");
      return json<ActionResult>({ ok: true, intent: "pix", pagamento });
    } catch (err) {
      const message =
        err instanceof ApiValidationError ? err.message : "Não foi possível gerar o Pix.";
      return json<ActionResult>({ ok: false, intent, message }, { status: 422 });
    }
  }

  if (intent === "simular") {
    const gatewayId = String(form.get("gateway_id") ?? "");
    if (!gatewayId) {
      return json<ActionResult>({ ok: false, intent, message: "Gateway não informado." }, { status: 422 });
    }
    try {
      await simularAprovacao(token, gatewayId);
      return json<ActionResult>({ ok: true, intent: "simular" });
    } catch (err) {
      const message =
        err instanceof ApiValidationError ? err.message : "Falha ao simular o pagamento.";
      return json<ActionResult>({ ok: false, intent, message }, { status: 422 });
    }
  }

  return json<ActionResult>({ ok: false, intent, message: "Ação inválida." }, { status: 400 });
}

export default function CheckoutPagamento() {
  const { numero, pedido, fake } = useLoaderData<typeof loader>();

  const pixFetcher = useFetcher<ActionResult>();
  const simFetcher = useFetcher<ActionResult>();
  const statusFetcher = useFetcher<{ pedido: Pedido }>();

  const [pagamento, setPagamento] = useState<PagamentoPix | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pago, setPago] = useState(false);

  // Guarda os dados do Pix quando a action retorna.
  useEffect(() => {
    if (pixFetcher.data && pixFetcher.data.ok && pixFetcher.data.intent === "pix") {
      setPagamento(pixFetcher.data.pagamento);
    }
  }, [pixFetcher.data]);

  // Polling do status enquanto a cobrança Pix está ativa e o pedido não está pago.
  const ativo = pagamento != null && !pago;
  useEffect(() => {
    if (!ativo) return;
    const id = setInterval(() => {
      statusFetcher.load(`/conta/pedidos/${encodeURIComponent(numero)}/status`);
    }, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, numero]);

  // Detecta pagamento confirmado (via polling) e redireciona.
  useEffect(() => {
    const s = statusFetcher.data?.pedido?.status;
    if (s && s !== "aguardando_pagamento") {
      setPago(true);
      window.location.assign(`/checkout/sucesso/${encodeURIComponent(numero)}`);
    }
  }, [statusFetcher.data, numero]);

  // Após simular com sucesso, redireciona direto.
  useEffect(() => {
    if (simFetcher.data && simFetcher.data.ok && simFetcher.data.intent === "simular") {
      setPago(true);
      window.location.assign(`/checkout/sucesso/${encodeURIComponent(numero)}`);
    }
  }, [simFetcher.data, numero]);

  function copiar() {
    if (!pagamento) return;
    navigator.clipboard?.writeText(pagamento.pix_copia_cola).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    });
  }

  const gerando = pixFetcher.state !== "idle";
  const erroPix =
    pixFetcher.data && pixFetcher.data.ok === false ? pixFetcher.data.message : undefined;
  const valor = pagamento?.valor ?? pedido.total;

  return (
    <div className="co-pay">
      <div className="co-pay-card">
        <div className="co-pay-head">
          <span className="pix-badge">
            <QrCode size={16} /> Pagamento via Pix
          </span>
          <h1>Pague para concluir o pedido</h1>
          <p className="lead">
            Pedido Nº {numero} · valor a pagar <strong className="mint">{formatBRL(valor)}</strong>
          </p>
        </div>

        {!pagamento ? (
          <div className="co-pay-start">
            <p className="co-note" style={{ textAlign: "center" }}>
              Gere o código Pix para pagar agora. A confirmação é automática.
            </p>
            {erroPix && (
              <div className="ct-alert ct-alert--err" role="alert">
                {erroPix}
              </div>
            )}
            <pixFetcher.Form method="post">
              <input type="hidden" name="intent" value="pix" />
              <button type="submit" className="ct-btn ct-btn--mint" disabled={gerando}>
                {gerando ? "Gerando código..." : "Gerar código Pix"}
              </button>
            </pixFetcher.Form>
          </div>
        ) : (
          <div className="co-pay-body">
            <div className="co-pay-qr">
              <img src={pagamento.pix_qr} alt="QR Code Pix" />
            </div>

            <div className="co-pay-valor">{formatBRL(valor)}</div>

            <div className="co-pay-copia">
              <label>Pix copia e cola</label>
              <div className="codebox">
                <code>{pagamento.pix_copia_cola}</code>
              </div>
              <button type="button" className="ct-btn ct-btn--ghost" onClick={copiar}>
                {copiado ? <Check size={16} /> : <Copy size={16} />}
                {copiado ? "Código copiado" : "Copiar código"}
              </button>
            </div>

            <div className="co-pay-wait">
              <Loader2 className="spin" size={16} /> Aguardando pagamento...
            </div>

            {fake && (
              <Form
                method="post"
                onSubmit={(e) => {
                  e.preventDefault();
                  simFetcher.submit(
                    { intent: "simular", gateway_id: pagamento.gateway_id },
                    { method: "post" },
                  );
                }}
              >
                <button
                  type="submit"
                  className="co-pay-dev"
                  disabled={simFetcher.state !== "idle"}
                >
                  {simFetcher.state !== "idle" ? "Confirmando..." : "Já fiz o pagamento (simular)"}
                </button>
              </Form>
            )}
          </div>
        )}

        <div className="co-pay-secure">
          <ShieldCheck size={15} /> Ambiente seguro
        </div>
      </div>

      <div className="co-pay-links">
        <Link to={`/conta/pedidos/${encodeURIComponent(numero)}`}>Ver detalhes do pedido</Link>
      </div>
    </div>
  );
}
