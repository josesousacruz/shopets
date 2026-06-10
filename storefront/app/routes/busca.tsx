import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { api } from "~/lib/api.server";
import { ProductGrid } from "~/components/catalog/ProductGrid";
import { SortBar } from "~/components/catalog/SortBar";
import catalogStyles from "~/styles/catalog.css?url";
import type { ProdutoLista } from "~/types/api";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: catalogStyles }];

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
    <>
      <section className="cat-hero">
        <div className="row">
          <div>
            <nav className="crumb" aria-label="Trilha de navegação">
              <span className="current">Busca</span>
            </nav>
            <h1>{termo ? <>Resultados para <em>“{termo}”</em></> : "Buscar produtos"}</h1>
            {meta && (
              <p>
                {meta.total} {meta.total === 1 ? "produto encontrado" : "produtos encontrados"}.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="cat-main">
        <div className="row" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            {termo === "" ? (
              <div className="cat-empty">
                <h3>O que você procura?</h3>
                <p>Use o campo de busca no topo da página para encontrar produtos.</p>
              </div>
            ) : produtos.length === 0 ? (
              <div className="cat-empty">
                <h3>Nada encontrado para “{termo}”</h3>
                <p>Tente outras palavras ou explore o catálogo completo.</p>
              </div>
            ) : (
              <>
                {meta && <SortBar total={meta.total} action="/busca" />}
                <ProductGrid produtos={produtos} />
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
