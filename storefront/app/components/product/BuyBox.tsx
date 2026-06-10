import { useEffect, useRef, type ReactNode } from "react";
import { useFetcher } from "@remix-run/react";
import { ShoppingCart, Heart, Truck, RefreshCw, ShieldCheck } from "lucide-react";
import { formatBRL } from "~/lib/format";
import { useCart } from "~/components/cart/CartContext";
import type { ProdutoDetalhe, Variacao } from "~/types/api";

interface Props {
  produto: ProdutoDetalhe;
  variacaoSelecionada: Variacao | null;
  /** Rendered between the price block and the CTA (e.g. the VariationPicker). */
  children?: ReactNode;
}

export function BuyBox({ produto, variacaoSelecionada, children }: Props) {
  const temVariacoes = produto.variacoes.length > 0;
  const { openCart, showToast } = useCart();
  const fetcher = useFetcher<{ ok: boolean; message?: string }>();
  const submittedRef = useRef(false);
  const adicionando = fetcher.state !== "idle";

  // Após sucesso: abre drawer + toast; senão mostra mensagem de erro.
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

      {(() => {
        // Exige escolher variação quando o produto tem variações.
        const precisaEscolher = temVariacoes && !variacaoSelecionada;
        const desabilitado = indisponivel || precisaEscolher || adicionando;
        const label = indisponivel
          ? "Esgotado"
          : precisaEscolher
            ? "Escolha uma opção"
            : adicionando
              ? "Adicionando..."
              : "Adicionar ao carrinho";

        return (
          <fetcher.Form method="post" action="/api/carrinho" className="pdp-cta">
            <input type="hidden" name="intent" value="add" />
            <input type="hidden" name="id_produto" value={produto.id} />
            {variacaoSelecionada && (
              <input type="hidden" name="id_variacao" value={variacaoSelecionada.id} />
            )}
            <input type="hidden" name="quantidade" value="1" />
            <button
              type="submit"
              className="add"
              disabled={desabilitado}
              onClick={() => { submittedRef.current = true; }}
            >
              <ShoppingCart />
              {label}
            </button>
            <button type="button" className="wish" title="Favoritar" aria-label="Favoritar">
              <Heart />
            </button>
          </fetcher.Form>
        );
      })()}

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
