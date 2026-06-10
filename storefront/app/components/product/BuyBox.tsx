import type { ReactNode } from "react";
import { ShoppingCart, Heart, Truck, RefreshCw, ShieldCheck } from "lucide-react";
import { formatBRL } from "~/lib/format";
import type { ProdutoDetalhe, Variacao } from "~/types/api";

interface Props {
  produto: ProdutoDetalhe;
  variacaoSelecionada: Variacao | null;
  /** Rendered between the price block and the CTA (e.g. the VariationPicker). */
  children?: ReactNode;
}

export function BuyBox({ produto, variacaoSelecionada, children }: Props) {
  const temVariacoes = produto.variacoes.length > 0;

  const precoVenda = variacaoSelecionada?.preco_venda ?? produto.preco_venda;
  const precoPromocional =
    variacaoSelecionada?.preco_promocional ?? produto.preco_promocional ?? null;

  const emPromocao = precoPromocional != null && precoPromocional < precoVenda;
  const precoEfetivo = emPromocao ? (precoPromocional as number) : precoVenda;

  const parcela = precoEfetivo / 10;
  const pix = precoEfetivo * 0.95;
  const pct = emPromocao ? Math.round((1 - (precoPromocional as number) / precoVenda) * 100) : 0;

  const indisponivel = temVariacoes
    ? variacaoSelecionada
      ? !variacaoSelecionada.disponivel
      : !produto.disponivel
    : !produto.disponivel;

  return (
    <>
      <div className="pdp-price">
        {emPromocao && <span className="strike">{formatBRL(precoVenda)}</span>}
        <span className="now">
          {formatBRL(precoEfetivo)}
          {pct > 0 && <span className="pct">-{pct}%</span>}
        </span>
        <span className="install">
          ou 10x de <b>{formatBRL(parcela)}</b> sem juros
        </span>
        <span className="pix">à vista no Pix {formatBRL(pix)} (5% OFF)</span>
      </div>

      {children}

      <div className="pdp-cta">
        <button
          type="button"
          className="add"
          disabled
          title="Em breve — carrinho na próxima etapa"
        >
          <ShoppingCart />
          {indisponivel ? "Esgotado" : "Adicionar ao carrinho"}
        </button>
        <button type="button" className="wish" title="Favoritar" aria-label="Favoritar">
          <Heart />
        </button>
      </div>
      <p className="pdp-cta-note">
        Carrinho disponível em breve. Por enquanto, é só uma vitrine.
      </p>

      <div className="pdp-trust">
        <div>
          <Truck />
          Frete grátis acima de {formatBRL(199)}
        </div>
        <div>
          <RefreshCw />
          Troca grátis em até 7 dias
        </div>
        <div>
          <ShieldCheck />
          Compra 100% segura
        </div>
      </div>
    </>
  );
}
