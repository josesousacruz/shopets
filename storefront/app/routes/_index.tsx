import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { ArrowRight } from "lucide-react";
import { api } from "~/lib/api.server";
import { ProductGrid } from "~/components/catalog/ProductGrid";

export const meta: MetaFunction = () => [
  { title: "Shopets — capas e acessórios pro seu celular" },
  { name: "description", content: "Capas, películas, carregadores e fones com entrega rápida em todo o Brasil." },
];

export async function loader(_args: LoaderFunctionArgs) {
  const [categorias, destaques] = await Promise.all([
    api.categorias.list(),
    api.produtos.list({ destaque: 1, por_pagina: 8 }),
  ]);
  return { categorias: categorias.data, destaques: destaques.data };
}

export default function Home() {
  const { categorias, destaques } = useLoaderData<typeof loader>();

  return (
    <div>
      <section className="bg-gradient-to-br from-brand-primary to-violet-800 text-white">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 py-16 lg:py-24">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-3xl">
            Capas e acessórios pro seu celular, entregues em casa
          </h1>
          <p className="mt-4 text-lg text-violet-100 max-w-2xl">
            Capas, películas, carregadores e fones para iPhone, Samsung, Xiaomi e Motorola.
          </p>
          <Link
            to="/loja"
            className="mt-8 inline-flex items-center gap-2 bg-brand-accent text-ink font-bold px-6 py-3 rounded-full hover:bg-lime-300 transition-colors"
          >
            Ver a loja
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 lg:px-8 py-12">
        <h2 className="font-display font-extrabold text-2xl mb-6">Categorias</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categorias.map((c) => (
            <Link
              key={c.id}
              to={`/loja/${c.slug}`}
              className="group rounded-2xl border border-slate-200 hover:border-brand-primary p-6 transition-colors"
            >
              <p className="font-display font-bold text-base group-hover:text-brand-primary">
                {c.nome}
              </p>
              <p className="text-xs text-slate-500 mt-1">{c.descricao}</p>
            </Link>
          ))}
        </div>
      </section>

      {destaques.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-extrabold text-2xl">Destaques</h2>
            <Link to="/loja" className="text-sm font-medium text-brand-primary hover:underline">
              Ver todos →
            </Link>
          </div>
          <ProductGrid produtos={destaques} />
        </section>
      )}
    </div>
  );
}
