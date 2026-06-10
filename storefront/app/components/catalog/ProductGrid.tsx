import type { ProdutoLista } from "~/types/api";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ produtos }: { produtos: ProdutoLista[] }) {
  if (produtos.length === 0) {
    return (
      <p className="text-center py-16 text-slate-500">
        Nenhum produto encontrado.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
      {produtos.map((p) => (
        <ProductCard key={p.id} produto={p} />
      ))}
    </div>
  );
}
