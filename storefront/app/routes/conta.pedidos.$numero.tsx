import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { ArrowLeft, Check, Copy, ExternalLink, Truck } from "lucide-react";
import { requireToken } from "~/lib/session.server";
import { obterPedido } from "~/lib/cart.server";
import { ApiValidationError } from "~/lib/auth.server";
import { formatBRL } from "~/lib/format";
import { STATUS_FLUXO, STATUS_LABEL, STATUS_SUB } from "~/lib/pedido";
import type { Pedido } from "~/types/api";
import contaStyles from "~/styles/conta.css?url";
import checkoutStyles from "~/styles/checkout.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: contaStyles },
  { rel: "stylesheet", href: checkoutStyles },
];

export const meta: MetaFunction<typeof loader> = ({ data: d }) => [
  { title: d ? `Pedido ${d.pedido.numero} — Shopets` : "Pedido — Shopets" },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = await requireToken(request);
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

function formatData(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

/** URL para acompanhar a entrega: usa a etiqueta/rastreio do pedido quando houver,
 * senão cai numa busca pública dos Correios pelo código. */
function trackingUrl(pedido: Pedido): string {
  if (pedido.etiqueta_url) return pedido.etiqueta_url;
  const cod = pedido.codigo_rastreio ?? "";
  return `https://rastreamento.correios.com.br/app/index.php?objetos=${encodeURIComponent(cod)}`;
}

function CopyButton({ value }: { value: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className="ct-btn ct-btn--ghost"
      style={{ width: "auto", padding: "8px 12px", gap: 6 }}
      onClick={() => {
        navigator.clipboard?.writeText(value).then(
          () => {
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1800);
          },
          () => {},
        );
      }}
    >
      {copiado ? <Check size={14} /> : <Copy size={14} />}
      {copiado ? "Copiado" : "Copiar"}
    </button>
  );
}

export default function PedidoDetalhe() {
  const { pedido } = useLoaderData<typeof loader>();
  const end = pedido.endereco_entrega;

  const cancelado = pedido.status === "cancelado";
  const idxAtual = STATUS_FLUXO.indexOf(pedido.status as (typeof STATUS_FLUXO)[number]);
  const mostrarRastreio = pedido.status === "enviado" || pedido.status === "entregue" || !!pedido.codigo_rastreio;

  return (
    <div className="ct-wrap">
      <div className="ct-head" style={{ marginBottom: 20 }}>
        <h1>Pedido {pedido.numero}</h1>
        <p>{pedido.criado_em ? `Feito em ${formatData(pedido.criado_em)}` : "Detalhes do pedido"}</p>
      </div>

      <div style={{ marginBottom: 22, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <span className={`co-status s-${pedido.status}`}>
          <span className="d" /> {STATUS_LABEL[pedido.status] ?? pedido.status}
        </span>
        {pedido.status === "aguardando_pagamento" && (
          <Link
            to={`/checkout/pagamento/${encodeURIComponent(pedido.numero)}`}
            className="ct-btn ct-btn--mint"
            style={{ width: "auto" }}
          >
            Pagar agora
          </Link>
        )}
      </div>

      <div className="co-detail">
        <div>
          {/* Itens */}
          <section className="co-card">
            <h2>Itens</h2>
            <div className="co-lines" style={{ marginTop: 14, borderRadius: 14 }}>
              {(pedido.itens ?? []).map((it) => (
                <div className="co-line" key={it.id} style={{ gridTemplateColumns: "1fr auto" }}>
                  <div className="info">
                    <div className="name">{it.nome}</div>
                    {it.sku && <div className="var">SKU {it.sku}</div>}
                    <div className="unit">
                      {it.quantidade} × {formatBRL(it.preco_unit)}
                    </div>
                  </div>
                  <div className="end">
                    <div className="line-price">{formatBRL(it.subtotal)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Rastreamento */}
          {mostrarRastreio && (
            <section className="co-card">
              <h2>
                <Truck size={18} style={{ verticalAlign: "-3px", marginRight: 8, color: "var(--mint-deep)" }} />
                Rastreamento
              </h2>
              {pedido.codigo_rastreio ? (
                <>
                  <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6 }}>
                    Seu pedido foi despachado. Use o código abaixo para acompanhar a entrega.
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                      marginTop: 14,
                    }}
                  >
                    <code
                      style={{
                        fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: 15,
                        fontWeight: 700,
                        letterSpacing: ".04em",
                        color: "var(--ink)",
                        background: "rgba(136,226,202,.18)",
                        border: "1px solid rgba(136,226,202,.5)",
                        borderRadius: 10,
                        padding: "9px 14px",
                      }}
                    >
                      {pedido.codigo_rastreio}
                    </code>
                    <CopyButton value={pedido.codigo_rastreio} />
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6 }}>
                  O código de rastreio será disponibilizado em breve.
                </p>
              )}
              <a
                href={trackingUrl(pedido)}
                target="_blank"
                rel="noreferrer noopener"
                className="ct-btn ct-btn--mint"
                style={{ width: "auto", marginTop: 16, gap: 8 }}
              >
                Acompanhar entrega
                <ExternalLink size={15} />
              </a>
            </section>
          )}

          {/* Status timeline */}
          {!cancelado && (
            <section className="co-card">
              <h2>Acompanhamento</h2>
              <ul className="co-timeline" style={{ marginTop: 14 }}>
                {STATUS_FLUXO.map((s, i) => {
                  const done = i < idxAtual;
                  const current = i === idxAtual;
                  const cls = done ? "done" : current ? "current" : "pending";
                  return (
                    <li className={cls} key={s}>
                      <span className="node">{done && <Check />}</span>
                      <span className="lbl">{STATUS_LABEL[s]}</span>
                      {current && <span className="sub">{STATUS_SUB[s]}</span>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Endereço */}
          {end && (
            <section className="co-card">
              <h2>Endereço de entrega</h2>
              <address style={{ fontStyle: "normal", fontSize: 14, color: "var(--muted)", lineHeight: 1.6, marginTop: 12 }}>
                {end.apelido && <strong style={{ color: "var(--ink)" }}>{end.apelido}<br /></strong>}
                {end.logradouro}, {end.numero}
                {end.complemento ? ` — ${end.complemento}` : ""}
                <br />
                {end.bairro} — {end.cidade}/{end.uf}
                <br />
                CEP {end.cep}
              </address>
            </section>
          )}
        </div>

        {/* Resumo */}
        <aside className="co-summary">
          <h2>Resumo</h2>
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
          <div className="divider" />
          <div className="total">
            <span>Total</span>
            <b>{formatBRL(pedido.total)}</b>
          </div>
        </aside>
      </div>

      <div className="ct-links" style={{ marginTop: 28 }}>
        <Link to="/conta/pedidos">
          <ArrowLeft size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          Voltar aos pedidos
        </Link>
      </div>
    </div>
  );
}
