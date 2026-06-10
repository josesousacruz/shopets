import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { api } from "~/lib/api.server";
import { CatalogLayout } from "~/components/catalog/CatalogLayout";
import catalogStyles from "~/styles/catalog.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: catalogStyles }];

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
      em_promocao: url.searchParams.get("em_promocao") ?? undefined,
      preco_min: url.searchParams.get("preco_min") ?? undefined,
      preco_max: url.searchParams.get("preco_max") ?? undefined,
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
    <CatalogLayout
      titulo={categoriaAtiva.nome}
      descricao={categoriaAtiva.descricao}
      crumbs={[
        { label: "Início", to: "/" },
        { label: "Loja", to: "/loja" },
        { label: categoriaAtiva.nome },
      ]}
      categorias={categorias}
      ativaSlug={categoriaAtiva.slug}
      produtos={produtos}
      meta={meta}
      formAction={`/loja/${categoriaAtiva.slug}`}
    />
  );
}
