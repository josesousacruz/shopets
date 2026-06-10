import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { api } from "~/lib/api.server";
import { CategoryFilters } from "~/components/catalog/CategoryFilters";
import { ProductGrid } from "~/components/catalog/ProductGrid";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const cat = data?.categoriaAtiva;
  return [
    { title: `${cat?.nome ?? "Categoria"} — Shopets` },
    { name: "description", content: cat?.descricao ?? "Confira nossos produtos." },
  ];
};

export async function loader({ params, request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const slug = params.categoria!;

  const [categorias, produtos] = await Promise.all([
    api.categorias.list(),
    api.produtos.list({
      categoria: slug,
      ordem: url.searchParams.get("ordem") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      por_pagina: 24,
    }),
  ]);

  const categoriaAtiva = categorias.data.find((c) => c.slug === slug);
  if (!categoriaAtiva) throw new Response("Categoria não encontrada", { status: 404 });

  return { categorias: categorias.data, categoriaAtiva, produtos: produtos.data, meta: produtos.meta };
}

export default function LojaCategoria() {
  const { categorias, categoriaAtiva, produtos, meta } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-7xl px-4 lg:px-8 py-8">
      <nav className="text-sm text-slate-500 mb-2">
        <Link to="/loja" className="hover:underline">Loja</Link> / {categoriaAtiva.nome}
      </nav>
      <h1 className="font-display font-extrabold text-3xl mb-6">{categoriaAtiva.nome}</h1>
      {categoriaAtiva.descricao && <p className="text-slate-600 mb-6 max-w-prose">{categoriaAtiva.descricao}</p>}
      <div className="grid lg:grid-cols-[240px_1fr] gap-8">
        <CategoryFilters categorias={categorias} ativaSlug={categoriaAtiva.slug} />
        <div>
          <p className="text-sm text-slate-500 mb-4">{meta.total} produtos</p>
          <ProductGrid produtos={produtos} />
        </div>
      </div>
    </div>
  );
}
