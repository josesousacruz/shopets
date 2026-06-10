import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { api } from "~/lib/api.server";
import { ProductGrid } from "~/components/catalog/ProductGrid";
import type { ProdutoLista } from "~/types/api";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data?.termo ? `Busca: ${data.termo} — Shopets` : "Busca — Shopets" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  if (q.trim() === "") {
    return { termo: "", produtos: [] as ProdutoLista[], meta: null };
  }

  const result = await api.busca({ q, por_pagina: 48 });
  return { termo: result.termo, produtos: result.data, meta: result.meta };
}

export default function Busca() {
  const { termo, produtos, meta } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-7xl px-4 lg:px-8 py-8">
      <h1 className="font-display font-extrabold text-3xl mb-2">
        {termo ? `Resultados para "${termo}"` : "Buscar produtos"}
      </h1>
      {meta && <p className="text-sm text-slate-500 mb-6">{meta.total} produtos encontrados</p>}
      {termo === "" ? (
        <p className="text-slate-500 py-16 text-center">
          Use o campo de busca no topo da página para procurar produtos.
        </p>
      ) : (
        <ProductGrid produtos={produtos} />
      )}
    </div>
  );
}
