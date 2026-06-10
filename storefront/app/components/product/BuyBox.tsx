import { ShoppingCart } from "lucide-react";
import { Price } from "~/components/ui/Price";
import type { ProdutoDetalhe, Variacao } from "~/types/api";

interface Props {
  produto: ProdutoDetalhe;
  variacaoSelecionada: Variacao | null;
}

export function BuyBox({ produto, variacaoSelecionada }: Props) {
  const temVariacoes = produto.variacoes.length > 0;
  const precoVenda = variacaoSelecionada?.preco_venda ?? produto.preco_venda;
  const precoPromocional = variacaoSelecionada?.preco_promocional ?? produto.preco_promocional;

  const podeComprar = temVariacoes
    ? variacaoSelecionada !== null && variacaoSelecionada.disponivel
    : produto.disponivel;

  const cta = !produto.disponivel
    ? "Esgotado"
    : temVariacoes && !variacaoSelecionada
    ? "Selecione uma variação"
    : "Adicionar ao carrinho";

  return (
    <div className="space-y-4">
      <Price precoVenda={precoVenda} precoPromocional={precoPromocional} size="lg" />
      {precoPromocional && (
        <p className="text-sm text-emerald-700 font-medium">
          Você economiza {formatEconomia(precoVenda, precoPromocional)}
        </p>
      )}
      <button
        type="button"
        disabled={!podeComprar}
        className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-brand-accent text-ink font-bold px-6 py-3 rounded-full hover:bg-lime-300 transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
      >
        <ShoppingCart className="size-4" />
        {cta}
      </button>
      <p className="text-xs text-slate-500">
        Carrinho disponível em breve. Por enquanto, é só uma vitrine.
      </p>
    </div>
  );
}

function formatEconomia(de: number, por: number) {
  const economia = de - por;
  const pct = Math.round((economia / de) * 100);
  return `R$ ${economia.toFixed(2).replace(".", ",")} (${pct}%)`;
}
