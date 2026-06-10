import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { api } from "~/lib/api.server";
import { CatalogLayout } from "~/components/catalog/CatalogLayout";
import catalogStyles from "~/styles/catalog.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: catalogStyles }];

export const meta: MetaFunction = () => [
  { title: "Loja — Shopets" },
  { name: "description", content: "Catálogo completo de capas e acessórios para celular." },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const params = {
    categoria: url.searchParams.get("categoria") ?? undefined,
    ordem: url.searchParams.get("ordem") ?? undefined,
    em_promocao: url.searchParams.get("em_promocao") ?? undefined,
    preco_min: url.searchParams.get("preco_min") ?? undefined,
    preco_max: url.searchParams.get("preco_max") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    por_pagina: 24,
  };

  const [categorias, produtos] = await Promise.all([
    api.categorias.list(),
    api.produtos.list(params),
  ]);

  return { categorias: categorias.data, produtos: produtos.data, meta: produtos.meta };
}

export default function LojaIndex() {
  const { categorias, produtos, meta } = useLoaderData<typeof loader>();

  return (
    <CatalogLayout
      titulo="Catálogo completo"
      descricao="Capas, películas, carregadores e acessórios para o seu celular. Filtre por categoria, preço ou ofertas."
      crumbs={[{ label: "Início", to: "/" }, { label: "Loja" }]}
      categorias={categorias}
      produtos={produtos}
      meta={meta}
      formAction="/loja"
    />
  );
}
