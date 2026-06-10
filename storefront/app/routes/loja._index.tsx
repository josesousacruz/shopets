import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import { api } from "~/lib/api.server";
import { CategoryFilters } from "~/components/catalog/CategoryFilters";
import { ProductGrid } from "~/components/catalog/ProductGrid";

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
  const [params] = useSearchParams();

  return (
    <div className="mx-auto max-w-7xl px-4 lg:px-8 py-8">
      <h1 className="font-display font-extrabold text-3xl mb-6">Loja</h1>
      <div className="grid lg:grid-cols-[240px_1fr] gap-8">
        <CategoryFilters categorias={categorias} />
        <div>
          <p className="text-sm text-slate-500 mb-4">{meta.total} produtos</p>
          <ProductGrid produtos={produtos} />
          {meta.last_page > 1 && (
            <nav className="mt-8 flex justify-center gap-2">
              {Array.from({ length: meta.last_page }, (_, i) => i + 1).map((p) => {
                const sp = new URLSearchParams(params);
                sp.set("page", String(p));
                return (
                  <Link
                    key={p}
                    to={`?${sp.toString()}`}
                    className={
                      p === meta.current_page
                        ? "px-3 py-1 rounded bg-brand-primary text-white text-sm"
                        : "px-3 py-1 rounded border border-slate-200 text-sm hover:border-brand-primary"
                    }
                  >
                    {p}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
