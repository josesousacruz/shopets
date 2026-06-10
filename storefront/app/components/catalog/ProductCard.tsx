import { Link } from "@remix-run/react";
import type { ProdutoLista } from "~/types/api";
import { Badges } from "./Badges";
import { Price } from "~/components/ui/Price";

export function ProductCard({ produto }: { produto: ProdutoLista }) {
  return (
    <Link
      to={`/produto/${produto.slug}`}
      className="group block rounded-2xl border border-slate-200 hover:border-brand-primary hover:shadow-card transition-all overflow-hidden bg-white"
    >
      <div className="relative aspect-square bg-muted">
        {produto.imagem_capa ? (
          <img
            src={produto.imagem_capa}
            alt={produto.nome}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-400 text-xs">
            Sem imagem
          </div>
        )}
        <Badges
          novo={produto.novo}
          emPromocao={produto.em_promocao}
          destaque={produto.destaque}
          className="absolute top-3 left-3"
        />
        {!produto.disponivel && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-sm font-bold text-slate-700">Esgotado</span>
          </div>
        )}
      </div>
      <div className="p-4">
        {produto.categoria && (
          <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
            {produto.categoria.nome}
          </p>
        )}
        <h3 className="font-medium text-sm text-ink line-clamp-2 group-hover:text-brand-primary transition-colors">
          {produto.nome}
        </h3>
        <div className="mt-3">
          <Price precoVenda={produto.preco_venda} precoPromocional={produto.preco_promocional} size="md" />
        </div>
      </div>
    </Link>
  );
}
