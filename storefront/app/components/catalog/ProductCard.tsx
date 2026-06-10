import { Link } from "@remix-run/react";
import { ShoppingCart, Heart } from "lucide-react";
import type { ProdutoLista } from "~/types/api";
import { formatBRL } from "~/lib/format";

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
            <button
              type="button"
              className="buy"
              disabled
              title="Em breve"
              style={{ opacity: 0.55, cursor: "not-allowed" }}
            >
              <ShoppingCart className="size-4" />
              Comprar
            </button>
            <button type="button" className="wish" title="Favoritar" aria-label="Favoritar">
              <Heart className="size-[18px]" />
            </button>
          </div>
        </div>
      </Link>
    </article>
  );
}
