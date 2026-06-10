import { useEffect, useRef } from "react";
import { Link, useFetcher } from "@remix-run/react";
import { ShoppingCart, Heart, SlidersHorizontal } from "lucide-react";
import type { ProdutoLista } from "~/types/api";
import { formatBRL } from "~/lib/format";
import { useCart } from "~/components/cart/CartContext";

/** Renders a BRL price with the centavos in a smaller font (.now .cents). */
function PriceNow({ value }: { value: number }) {
  const formatted = formatBRL(value); // ex: "R$ 39,90"
  const idx = formatted.lastIndexOf(",");
  if (idx === -1) return <span className="now">{formatted}</span>;
  const reais = formatted.slice(0, idx + 1); // "R$ 39,"
  const cents = formatted.slice(idx + 1); // "90"
  return (
    <span className="now">
      {reais}
      <span className="cents">{cents}</span>
    </span>
  );
}

export function ProductCard({ produto }: { produto: ProdutoLista }) {
  const emPromocao = produto.em_promocao && produto.preco_promocional != null;
  const precoEfetivo = emPromocao ? (produto.preco_promocional as number) : produto.preco_venda;
  const parcela = precoEfetivo / 10;

  const tag = emPromocao
    ? { cls: "promo", label: "Promoção" }
    : produto.novo
      ? { cls: "new", label: "Novo" }
      : produto.destaque
        ? { cls: "best", label: "Destaque" }
        : null;

  return (
    <article className="product-card">
      <Link
        to={`/produto/${produto.slug}`}
        style={{ display: "contents", color: "inherit" }}
        aria-label={produto.nome}
      >
        <div className="thumb">
          {tag && <span className={`tag ${tag.cls}`}>{tag.label}</span>}
          {produto.imagem_capa ? (
            <img
              className="ppt-img"
              src={produto.imagem_capa}
              alt={produto.nome}
              loading="lazy"
            />
          ) : (
            <div className="ppt-mock">
              <div>
                <div className="meta">{produto.categoria?.nome ?? "Shopets"}</div>
                <div className="title">{produto.nome}</div>
              </div>
              <div className="blocks">
                <i></i>
                <i></i>
                <i></i>
              </div>
            </div>
          )}
        </div>

        <div className="body">
          {produto.categoria && (
            <div className="crumb">
              <span className="dot"></span>
              {produto.categoria.nome}
            </div>
          )}
          <h3>{produto.nome}</h3>
          <div className="meta">
            <span className="pill">{produto.tem_variacoes ? "Com variações" : "Pronta entrega"}</span>
          </div>
          <div className="price">
            {emPromocao && <span className="strike">{formatBRL(produto.preco_venda)}</span>}
            <PriceNow value={precoEfetivo} />
            <span className="install">ou 10x de {formatBRL(parcela)}</span>
          </div>

          <div className="actions" onClick={(e) => e.preventDefault()}>
            <CardBuyButton produto={produto} />
            <button type="button" className="wish" title="Favoritar" aria-label="Favoritar">
              <Heart className="size-[18px]" />
            </button>
          </div>
        </div>
      </Link>
    </article>
  );
}

/**
 * Botão "Comprar" do card. Produtos com variações não podem escolher a
 * variação no card — viram link "Escolher opções" para a PDP. Sem variações,
 * adiciona direto ao carrinho (intent=add) e abre o drawer + toast.
 */
function CardBuyButton({ produto }: { produto: ProdutoLista }) {
  const { openCart, showToast } = useCart();
  const fetcher = useFetcher<{ ok: boolean; message?: string }>();
  const submittedRef = useRef(false);
  const busy = fetcher.state !== "idle";

  // Após sucesso: abre drawer + toast (ou mostra erro de estoque).
  // Hook declarado antes de qualquer return condicional (regras de hooks).
  useEffect(() => {
    if (fetcher.state === "idle" && submittedRef.current && fetcher.data) {
      submittedRef.current = false;
      if (fetcher.data.ok) {
        openCart();
        showToast("Produto adicionado ao carrinho");
      } else {
        showToast(fetcher.data.message ?? "Não foi possível adicionar.");
      }
    }
  }, [fetcher.state, fetcher.data, openCart, showToast]);

  // Produto indisponível: botão desabilitado.
  if (produto.disponivel === false) {
    return (
      <button type="button" className="buy" disabled title="Esgotado" style={{ opacity: 0.55, cursor: "not-allowed" }}>
        <ShoppingCart className="size-4" />
        Esgotado
      </button>
    );
  }

  // Com variações: encaminha para a PDP (escolha de variação).
  if (produto.tem_variacoes) {
    return (
      <Link to={`/produto/${produto.slug}`} className="buy" title="Escolher opções">
        <SlidersHorizontal className="size-4" />
        Escolher opções
      </Link>
    );
  }

  return (
    <fetcher.Form method="post" action="/api/carrinho" style={{ flex: 1 }}>
      <input type="hidden" name="intent" value="add" />
      <input type="hidden" name="id_produto" value={produto.id} />
      <input type="hidden" name="quantidade" value="1" />
      <button
        type="submit"
        className="buy"
        disabled={busy}
        style={{ width: "100%", opacity: busy ? 0.7 : 1 }}
        onClick={() => { submittedRef.current = true; }}
      >
        <ShoppingCart className="size-4" />
        {busy ? "Adicionando..." : "Comprar"}
      </button>
    </fetcher.Form>
  );
}
