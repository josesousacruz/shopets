import type { ActionFunctionArgs, LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { ArrowLeft, Check, Copy, ExternalLink, Truck, RotateCcw, X } from "lucide-react";
import { requireToken } from "~/lib/session.server";
import { obterPedido, listarDevolucoes, solicitarDevolucao } from "~/lib/cart.server";
import { ApiValidationError } from "~/lib/auth.server";
import { formatBRL } from "~/lib/format";
import { DEVOLUCAO_LABEL, STATUS_FLUXO, STATUS_LABEL, STATUS_SUB } from "~/lib/pedido";
import type { Devolucao, Pedido } from "~/types/api";
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
    // Devoluções já solicitadas para este pedido (tolerante a falhas).
    let devolucoes: Devolucao[] = [];
    try {
      const r = await listarDevolucoes(token, numero);
      devolucoes = r.data;
    } catch {
      devolucoes = [];
    }
    return json({ pedido, devolucoes });
  } catch (err) {
    if (err instanceof ApiValidationError && err.status === 404) {
      throw new Response("Pedido não encontrado", { status: 404 });
    }
    throw err;
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const token = await requireToken(request);
  const numero = params.numero!;
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "devolucao") {
    const motivo = String(form.get("motivo") ?? "").trim();

    // Itens marcados: para cada id_pedido_item com checkbox "sel_<id>", lê a quantidade.
    const itens: { id_pedido_item: number; quantidade: number }[] = [];
    for (const [key, val] of form.entries()) {
      const m = /^sel_(\d+)$/.exec(key);
      if (m && val === "on") {
        const id = Number(m[1]);
        const q = Number(form.get(`qtd_${id}`)) || 0;
        if (q > 0) itens.push({ id_pedido_item: id, quantidade: q });
      }
    }

    if (itens.length === 0) {
      return json({ ok: false as const, message: "Selecione ao menos um item para devolver." }, { status: 422 });
    }
    if (!motivo) {
      return json({ ok: false as const, message: "Informe o motivo da devolução." }, { status: 422 });
    }

    try {
      await solicitarDevolucao(token, numero, { itens, motivo });
      return json({ ok: true as const, message: "Solicitação de devolução enviada." });
    } catch (err) {
      if (err instanceof ApiValidationError) {
        const message =
          err.errors.prazo?.[0] ??
          err.errors.pedido?.[0] ??
          err.errors.itens?.[0] ??
          Object.values(err.errors)[0]?.[0] ??
          err.message;
        return json({ ok: false as const, message }, { status: err.status });
      }
      throw err;
    }
  }

  return json({ ok: false as const, message: "Ação inválida." }, { status: 400 });
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
  const { pedido, devolucoes } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const end = pedido.endereco_entrega;

  const cancelado = pedido.status === "cancelado";
  const idxAtual = STATUS_FLUXO.indexOf(pedido.status as (typeof STATUS_FLUXO)[number]);
  const mostrarRastreio = pedido.status === "enviado" || pedido.status === "entregue" || !!pedido.codigo_rastreio;

  // Elegibilidade de devolução: status enviado/entregue (backend valida prazo via 422).
  const elegivelDevolucao = pedido.status === "enviado" || pedido.status === "entregue";
  const temDevolucao = devolucoes.length > 0;

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

          {/* Devoluções */}
          {(elegivelDevolucao || temDevolucao) && (
            <section className="co-card">
              <h2>
                <RotateCcw size={18} style={{ verticalAlign: "-3px", marginRight: 8, color: "var(--mint-deep)" }} />
                Devolução
              </h2>

              {actionData?.message && (
                <div
                  className={`ct-alert ${actionData.ok ? "ct-alert--ok" : "ct-alert--err"}`}
                  role="alert"
                  style={{ marginTop: 12 }}
                >
                  {actionData.message}
                </div>
              )}

              {temDevolucao ? (
                <>
                  <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6 }}>
                    Acompanhe abaixo o andamento da(s) sua(s) solicitação(ões).
                  </p>
                  <div className="co-lines" style={{ marginTop: 12, borderRadius: 14 }}>
                    {devolucoes.map((d) => (
                      <div className="co-line" key={d.id} style={{ gridTemplateColumns: "1fr auto" }}>
                        <div className="info">
                          <div className="name">Solicitação #{d.id}</div>
                          <div className="var">
                            {d.itens.length} {d.itens.length === 1 ? "item" : "itens"} · {d.motivo}
                          </div>
                          {d.valor_reembolso != null && d.valor_reembolso > 0 && (
                            <div className="unit">Reembolso: {formatBRL(d.valor_reembolso)}</div>
                          )}
                        </div>
                        <div className="end">
                          <span className={`co-status s-dev-${d.status}`}>
                            <span className="d" /> {DEVOLUCAO_LABEL[d.status] ?? d.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6 }}>
                    Recebeu algo errado ou se arrependeu? Você tem até 7 dias após o recebimento para
                    solicitar a devolução.
                  </p>
                  <DevolucaoDialog pedido={pedido} busy={nav.state !== "idle"} />
                </>
              )}
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

/** Dialog para escolher itens + motivo e solicitar a devolução. */
function DevolucaoDialog({ pedido, busy }: { pedido: Pedido; busy: boolean }) {
  const [open, setOpen] = useState(false);
  // Quantidade selecionada por item (default = quantidade do pedido).
  const itens = pedido.itens ?? [];

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="ct-btn ct-btn--mint" style={{ width: "auto", marginTop: 16, gap: 8 }}>
          <RotateCcw size={15} /> Solicitar devolução
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="ct-overlay" />
        <Dialog.Content className="ct-dialog" aria-describedby={undefined} style={{ maxHeight: "88vh", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Dialog.Title asChild>
              <h2>Solicitar devolução</h2>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" aria-label="Fechar">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          <Form method="post" style={{ marginTop: 16 }}>
            <input type="hidden" name="intent" value="devolucao" />

            <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 8 }}>
              Selecione os itens que deseja devolver e ajuste a quantidade.
            </p>

            <div className="co-options" style={{ marginBottom: 14 }}>
              {itens.map((it) => (
                <label className="co-opt" key={it.id} style={{ alignItems: "center" }}>
                  <input type="checkbox" name={`sel_${it.id}`} />
                  <span className="dot" />
                  <span style={{ flex: 1 }}>
                    <span className="ttl">{it.nome}</span>
                    <span className="desc">
                      {it.quantidade} {it.quantidade === 1 ? "unidade" : "unidades"} ·{" "}
                      {formatBRL(it.preco_unit)}
                    </span>
                  </span>
                  <input
                    type="number"
                    name={`qtd_${it.id}`}
                    min={1}
                    max={it.quantidade}
                    defaultValue={it.quantidade}
                    style={{
                      width: 64,
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: "1px solid var(--border, rgba(4,3,30,.14))",
                      fontWeight: 700,
                      textAlign: "center",
                    }}
                    aria-label={`Quantidade a devolver de ${it.nome}`}
                  />
                </label>
              ))}
            </div>

            <div className="ct-field">
              <label htmlFor="motivo">Motivo da devolução</label>
              <textarea
                id="motivo"
                name="motivo"
                rows={3}
                required
                placeholder="Conte o que aconteceu (arrependimento, defeito, produto errado...)."
              />
            </div>

            <div className="co-cart-actions" style={{ marginTop: 18 }}>
              <Dialog.Close asChild>
                <button type="button" className="ct-btn ct-btn--ghost" style={{ width: "auto" }}>
                  Cancelar
                </button>
              </Dialog.Close>
              <button type="submit" className="ct-btn ct-btn--mint" style={{ width: "auto" }} disabled={busy}>
                {busy ? "Enviando..." : "Enviar solicitação"}
              </button>
            </div>
          </Form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
