import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { ArrowRight } from "lucide-react";
import { api } from "~/lib/api.server";
import { ProductGrid } from "~/components/catalog/ProductGrid";
import { Hero } from "~/components/marketing/Hero";
import { DepartmentGrid } from "~/components/marketing/DepartmentGrid";
import { TrustStrip } from "~/components/marketing/TrustStrip";
import { FaqAccordion } from "~/components/marketing/FaqAccordion";
import { Newsletter } from "~/components/marketing/Newsletter";
import homeStyles from "~/styles/home.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: homeStyles }];

export const meta: MetaFunction = () => [
  { title: "Shopets — capas e acessórios pro seu celular" },
  {
    name: "description",
    content:
      "Capas, películas, carregadores e fones com entrega rápida em todo o Brasil.",
  },
];

export async function loader(_args: LoaderFunctionArgs) {
  const [categorias, destaques, novidades, ofertas, geral] = await Promise.all([
    api.categorias.list(),
    api.produtos.list({ destaque: 1, por_pagina: 8 }),
    api.produtos.list({ ordem: "novidades", por_pagina: 4 }),
    api.produtos.list({ em_promocao: 1, por_pagina: 4 }),
    api.produtos.list({ por_pagina: 8 }),
  ]);

  // Fallback: se filtros vierem vazios, mostra fatias da lista geral
  // para que as prateleiras nunca fiquem em branco.
  const novidadesData =
    novidades.data.length > 0 ? novidades.data : geral.data.slice(0, 4);
  const ofertasData = ofertas.data.length > 0 ? ofertas.data : geral.data.slice(4, 8);

  return {
    categorias: categorias.data,
    destaques: destaques.data.length > 0 ? destaques.data : geral.data.slice(0, 8),
    novidades: novidadesData,
    ofertas: ofertasData,
  };
}

export default function Home() {
  const { categorias, destaques, novidades, ofertas } = useLoaderData<typeof loader>();

  return (
    <div>
      <Hero />

      <DepartmentGrid categorias={categorias} />

      {destaques.length > 0 && (
        <section className="shelf">
          <div className="fc-container">
            <div className="fc-section-head">
              <div>
                <span className="eye">Top da loja</span>
                <h2>Mais vendidos</h2>
              </div>
              <Link to="/loja" className="more">
                Ver todos
                <ArrowRight className="size-[14px]" />
              </Link>
            </div>
            <ProductGrid produtos={destaques} />
          </div>
        </section>
      )}

      {novidades.length > 0 && (
        <section className="shelf">
          <div className="fc-container">
            <div className="fc-section-head">
              <div>
                <span className="eye">Acabou de chegar</span>
                <h2>Lançamentos da semana</h2>
              </div>
              <Link to="/loja?ordem=novidades" className="more">
                Ver todos
                <ArrowRight className="size-[14px]" />
              </Link>
            </div>
            <ProductGrid produtos={novidades} />
          </div>
        </section>
      )}

      {ofertas.length > 0 && (
        <section className="shelf">
          <div className="fc-container">
            <div className="fc-section-head">
              <div>
                <span className="eye">Pague menos</span>
                <h2>Ofertas e combos com desconto</h2>
                <p className="lead">
                  Acessórios selecionados com preço especial por tempo limitado.
                </p>
              </div>
              <Link to="/loja?em_promocao=1" className="more">
                Ver todas as ofertas
                <ArrowRight className="size-[14px]" />
              </Link>
            </div>
            <ProductGrid produtos={ofertas} />
          </div>
        </section>
      )}

      <section>
        <div className="fc-container">
          <TrustStrip />
          <FaqAccordion />
          <Newsletter />
        </div>
      </section>
    </div>
  );
}
