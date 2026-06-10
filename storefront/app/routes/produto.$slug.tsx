import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { ChevronRight, Star } from "lucide-react";
import { api } from "~/lib/api.server";
import { env } from "~/lib/env.server";
import { jsonLdProduct } from "~/lib/seo";
import { Gallery } from "~/components/product/Gallery";
import { VariationPicker } from "~/components/product/VariationPicker";
import { BuyBox } from "~/components/product/BuyBox";
import catalogStyles from "~/styles/catalog.css?url";
import type { Variacao } from "~/types/api";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: catalogStyles }];

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: "Produto não encontrado" }];
  const p = data.produto;
  const description = p.seo.description ?? p.descricao_curta ?? undefined;
  const tags: ReturnType<MetaFunction> = [
    { title: p.seo.title },
    { property: "og:title", content: p.seo.title },
    { property: "og:type", content: "product" },
  ];
  if (description) {
    tags.push({ name: "description", content: description });
    tags.push({ property: "og:description", content: description });
  }
  if (p.seo.og_image) {
    tags.push({ property: "og:image", content: p.seo.og_image });
  }
  return tags;
};

export async function loader({ params }: LoaderFunctionArgs) {
  const slug = params.slug!;
  const result = await api.produtos.show(slug);
  return { produto: result.data, siteUrl: env.siteUrl };
}

export default function ProdutoDetalhe() {
  const { produto, siteUrl } = useLoaderData<typeof loader>();
  const [selecionada, setSelecionada] = useState<Variacao | null>(null);

  const temEspecificacoes =
    produto.peso_gramas !== null ||
    produto.dimensoes_cm.altura !== null ||
    produto.dimensoes_cm.largura !== null ||
    produto.dimensoes_cm.comprimento !== null;

  return (
    <article className="pdp">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct(produto, siteUrl)) }}
      />

      <nav className="crumb" aria-label="Trilha de navegação">
        <Link to="/">Início</Link>
        <ChevronRight />
        <Link to="/loja">Loja</Link>
        {produto.categoria && (
          <>
            <ChevronRight />
            <Link to={`/loja/${produto.categoria.slug}`}>{produto.categoria.nome}</Link>
          </>
        )}
        <ChevronRight />
        <span className="current">{produto.nome}</span>
      </nav>

      <div className="layout">
        <Gallery imagens={produto.galeria} nome={produto.nome} />

        <div className="pdp-buy">
          {produto.categoria && <div className="eyebrow">{produto.categoria.nome}</div>}
          <h1>{produto.nome}</h1>

          {/* rating estático — apenas visual */}
          <div className="rating" aria-hidden="true">
            <span className="stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} fill="currentColor" strokeWidth={0} />
              ))}
            </span>
            4,9 · (128 avaliações)
          </div>

          {produto.descricao_curta && <p className="short">{produto.descricao_curta}</p>}

          <BuyBox produto={produto} variacaoSelecionada={selecionada}>
            {produto.variacoes.length > 0 && (
              <VariationPicker
                variacoes={produto.variacoes}
                selecionada={selecionada}
                onSelecionar={setSelecionada}
              />
            )}
          </BuyBox>
        </div>
      </div>

      <div className="pdp-sections">
        {produto.descricao_longa && (
          <section>
            <h2>Descrição</h2>
            <div className="desc">{produto.descricao_longa}</div>
          </section>
        )}

        {temEspecificacoes && (
          <section>
            <h2>Especificações</h2>
            <dl className="pdp-specs">
              {produto.peso_gramas !== null && (
                <div>
                  <dt>Peso</dt>
                  <dd>{produto.peso_gramas} g</dd>
                </div>
              )}
              {(produto.dimensoes_cm.altura !== null ||
                produto.dimensoes_cm.largura !== null ||
                produto.dimensoes_cm.comprimento !== null) && (
                <div>
                  <dt>Dimensões (A × L × C)</dt>
                  <dd>
                    {produto.dimensoes_cm.altura ?? "—"} × {produto.dimensoes_cm.largura ?? "—"} ×{" "}
                    {produto.dimensoes_cm.comprimento ?? "—"} cm
                  </dd>
                </div>
              )}
            </dl>
          </section>
        )}
      </div>
    </article>
  );
}
