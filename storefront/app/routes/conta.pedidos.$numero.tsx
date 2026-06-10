import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { ArrowLeft, Check, Package } from "lucide-react";
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

export default function PedidoDetalhe() {
  const { pedido } = useLoaderData<typeof loader>();
  const end = pedido.endereco_entrega;

  const cancelado = pedido.status === "cancelado";
  const idxAtual = STATUS_FLUXO.indexOf(pedido.status as (typeof STATUS_FLUXO)[number]);

  return (
    <div className="ct-wrap">
      <div className="ct-head" style={{ marginBottom: 20 }}>
        <h1>Pedido {pedido.numero}</h1>
        <p>{pedido.criado_em ? `Feito em ${formatData(pedido.criado_em)}` : "Detalhes do pedido"}</p>
      </div>

      <div style={{ marginBottom: 22 }}>
        <span className={`co-status s-${pedido.status}`}>
          <span className="d" /> {STATUS_LABEL[pedido.status] ?? pedido.status}
        </span>
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
          {pedido.codigo_rastreio && (
            <div className="row" style={{ marginTop: 16 }}>
              <span>Rastreio</span>
              <b>{pedido.codigo_rastreio}</b>
            </div>
          )}
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
