import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useState } from "react";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight, ShieldCheck, Tag, X, Check } from "lucide-react";
import { fetchCarrinho } from "~/lib/cart.server";
import { formatBRL } from "~/lib/format";
import type { Carrinho, CarrinhoItem, CupomAplicado } from "~/types/api";
import checkoutStyles from "~/styles/checkout.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: checkoutStyles }];

export const meta: MetaFunction = () => [{ title: "Seu carrinho — Shopets" }];

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { carrinho, setCookie } = await fetchCarrinho(request);
    return json(
      { carrinho: carrinho as Carrinho | null },
      setCookie ? { headers: { "Set-Cookie": setCookie } } : undefined,
    );
  } catch {
    return json({ carrinho: null as Carrinho | null });
  }
}

type CupomFetcher = {
  ok: boolean;
  intent?: string;
  message?: string;
  cupom?: CupomAplicado | null;
};

/** Campo de cupom + estado aplicado, reflete o desconto no resumo via onChange. */
function CouponBox({ onChange }: { onChange: (c: CupomAplicado | null) => void }) {
  const fetcher = useFetcher<CupomFetcher>();
  const [aplicado, setAplicado] = useState<CupomAplicado | null>(null);
  const busy = fetcher.state !== "idle";
  const erro = fetcher.data && fetcher.data.ok === false ? fetcher.data.message : undefined;

  // Quando a action responde com sucesso, sincroniza o estado aplicado.
  const data = fetcher.data;
  if (data?.ok && fetcher.state === "idle") {
    const novo = data.intent === "cupom_remove" ? null : data.cupom ?? null;
    const mudou =
      (novo?.codigo ?? null) !== (aplicado?.codigo ?? null) ||
      (novo?.desconto ?? 0) !== (aplicado?.desconto ?? 0);
    if (mudou) {
      setAplicado(novo);
      onChange(novo);
    }
  }

  if (aplicado) {
    return (
      <div className="co-coupon applied">
        <div className="info">
          <span className="tag">
            <Check size={13} /> {aplicado.codigo}
          </span>
          <span className="desc">
            {aplicado.frete_gratis ? "Frete grátis aplicado" : `Desconto de ${formatBRL(aplicado.desconto)}`}
          </span>
        </div>
        <fetcher.Form method="post" action="/api/carrinho">
          <input type="hidden" name="intent" value="cupom_remove" />
          <button type="submit" className="rm" aria-label="Remover cupom" disabled={busy}>
            <X size={15} />
          </button>
        </fetcher.Form>
      </div>
    );
  }

  return (
    <fetcher.Form method="post" action="/api/carrinho" className="co-coupon">
      <input type="hidden" name="intent" value="cupom_apply" />
      <div className="field">
        <Tag size={15} />
        <input name="codigo" placeholder="Cupom de desconto" autoComplete="off" />
      </div>
      <button type="submit" className="apply" disabled={busy}>
        {busy ? "..." : "Aplicar"}
      </button>
      {erro && <div className="err">{erro}</div>}
    </fetcher.Form>
  );
}

export default function CarrinhoPage() {
  const { carrinho } = useLoaderData<typeof loader>();
  const itens = carrinho?.itens ?? [];
  const subtotal = carrinho?.subtotal ?? 0;
  const [cupom, setCupom] = useState<CupomAplicado | null>(null);
  const desconto = cupom?.desconto ?? 0;
  const totalEstimado = Math.max(0, subtotal - desconto);

  return (
    <div className="co-wrap">
      <div className="co-head">
        <h1>Seu carrinho</h1>
        <p>
          {itens.length > 0
            ? `${carrinho?.quantidade_total} ${carrinho?.quantidade_total === 1 ? "item" : "itens"} no carrinho`
            : "Revise seus itens antes de finalizar."}
        </p>
      </div>

      {itens.length === 0 ? (
        <div className="co-empty">
          <div className="ic">
            <ShoppingBag />
          </div>
          <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 16 }}>
            Seu carrinho está vazio
          </div>
          <p style={{ maxWidth: 360, lineHeight: 1.5 }}>
            Explore nossas capas, películas e acessórios e adicione seus favoritos.
          </p>
          <Link to="/loja" className="ct-btn ct-btn--mint" style={{ width: "auto" }}>
            Ver a loja
          </Link>
        </div>
      ) : (
        <div className="co-cart">
          <div>
            <div className="co-lines">
              {itens.map((item) => (
                <CartLine key={item.id} item={item} />
              ))}
            </div>
            <div className="co-cart-actions">
              <Link to="/loja" className="ct-btn ct-btn--ghost" style={{ width: "auto" }}>
                Continuar comprando
              </Link>
            </div>
          </div>

          <aside className="co-summary">
            <h2>Resumo</h2>
            <div className="row">
              <span>Subtotal</span>
              <b>{formatBRL(subtotal)}</b>
            </div>
            {desconto > 0 && (
              <div className="row">
                <span>Desconto{cupom ? ` (${cupom.codigo})` : ""}</span>
                <b className="free">-{formatBRL(desconto)}</b>
              </div>
            )}
            <div className="row">
              <span>Frete</span>
              {cupom?.frete_gratis ? <span className="free">Grátis</span> : <span>Calculado no checkout</span>}
            </div>

            <CouponBox onChange={setCupom} />

            <div className="divider" />
            <div className="total">
              <span>Total estimado</span>
              <b>{formatBRL(totalEstimado)}</b>
            </div>
            <Link to="/checkout" className="cta">
              Finalizar compra
              <ArrowRight />
            </Link>
            <div className="secure">
              <ShieldCheck /> Pagamento 100% seguro
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function CartLine({ item }: { item: CarrinhoItem }) {
  const fetcher = useFetcher<{ ok: boolean; message?: string }>();
  const submittedQty = fetcher.formData?.get("quantidade");
  const removendo = fetcher.formData?.get("intent") === "remove";
  const qty = submittedQty != null ? Number(submittedQty) : item.quantidade;
  const busy = fetcher.state !== "idle";
  const erro = fetcher.data && fetcher.data.ok === false ? fetcher.data.message : undefined;

  function setQty(next: number) {
    if (next < 1) return;
    fetcher.submit(
      { intent: "update", id: String(item.id), quantidade: String(next) },
      { method: "post", action: "/api/carrinho" },
    );
  }

  if (removendo) return null; // some otimista ao remover

  return (
    <div className="co-line">
      <div className="thumb">
        {item.imagem ? <img src={item.imagem} alt={item.nome ?? ""} /> : <span className="ph" />}
      </div>
      <div className="info">
        <div className="name">
          {item.slug ? <Link to={`/produto/${item.slug}`}>{item.nome ?? "Produto"}</Link> : item.nome ?? "Produto"}
        </div>
        {item.variacao?.nome && <div className="var">{item.variacao.nome}</div>}
        <div className="unit">{formatBRL(item.preco_unit)} / un.</div>
        {erro && (
          <div className="var" style={{ color: "var(--tag-promo)", fontWeight: 600, marginTop: 4 }}>
            {erro}
          </div>
        )}
      </div>
      <div className="end">
        <div className="line-price">{formatBRL(item.subtotal)}</div>
        <div className="co-qty" aria-label="Quantidade">
          <button type="button" onClick={() => setQty(qty - 1)} disabled={busy || qty <= 1} aria-label="Diminuir">
            <Minus size={14} />
          </button>
          <span className="val">{qty}</span>
          <button type="button" onClick={() => setQty(qty + 1)} disabled={busy} aria-label="Aumentar">
            <Plus size={14} />
          </button>
        </div>
        <fetcher.Form method="post" action="/api/carrinho">
          <input type="hidden" name="intent" value="remove" />
          <input type="hidden" name="id" value={item.id} />
          <button type="submit" className="remove" disabled={busy}>
            <Trash2 /> Remover
          </button>
        </fetcher.Form>
      </div>
    </div>
  );
}
