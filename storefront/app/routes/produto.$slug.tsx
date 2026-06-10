import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { api } from "~/lib/api.server";
import { env } from "~/lib/env.server";
import { jsonLdProduct } from "~/lib/seo";
import { Gallery } from "~/components/product/Gallery";
import { VariationPicker } from "~/components/product/VariationPicker";
import { BuyBox } from "~/components/product/BuyBox";
import { Badges } from "~/components/catalog/Badges";
import type { Variacao } from "~/types/api";

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

  return (
    <article className="mx-auto max-w-7xl px-4 lg:px-8 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct(produto, siteUrl)) }}
      />
      <nav className="text-sm text-slate-500 mb-4">
        <Link to="/" className="hover:underline">Início</Link>
        {" / "}
        <Link to="/loja" className="hover:underline">Loja</Link>
        {produto.categoria && (
          <>
            {" / "}
            <Link to={`/loja/${produto.categoria.slug}`} className="hover:underline">
              {produto.categoria.nome}
            </Link>
          </>
        )}
        {" / "}
        <span className="text-slate-700">{produto.nome}</span>
      </nav>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8 lg:gap-12">
        <div>
          <Gallery imagens={produto.galeria} nome={produto.nome} />
        </div>

        <div className="space-y-6">
          <div>
            <Badges
              novo={produto.novo}
              emPromocao={produto.em_promocao}
              destaque={produto.destaque}
              className="mb-3"
            />
            <h1 className="font-display font-extrabold text-3xl tracking-tight">{produto.nome}</h1>
            {produto.descricao_curta && (
              <p className="mt-2 text-slate-600">{produto.descricao_curta}</p>
            )}
          </div>

          {produto.variacoes.length > 0 && (
            <VariationPicker
              variacoes={produto.variacoes}
              selecionada={selecionada}
              onSelecionar={setSelecionada}
            />
          )}

          <BuyBox produto={produto} variacaoSelecionada={selecionada} />
        </div>
      </div>

      {produto.descricao_longa && (
        <section className="mt-12 prose max-w-3xl">
          <h2 className="font-display font-extrabold text-xl mb-4">Descrição</h2>
          <div className="text-slate-700 whitespace-pre-line">{produto.descricao_longa}</div>
        </section>
      )}

      {(produto.peso_gramas !== null || produto.dimensoes_cm.altura !== null) && (
        <section className="mt-12">
          <h2 className="font-display font-extrabold text-xl mb-4">Especificações</h2>
          <dl className="grid sm:grid-cols-2 gap-3 max-w-2xl">
            {produto.peso_gramas !== null && (
              <div className="flex justify-between border-b border-slate-200 py-2">
                <dt className="text-slate-500 text-sm">Peso</dt>
                <dd className="font-medium text-sm">{produto.peso_gramas} g</dd>
              </div>
            )}
            {produto.dimensoes_cm.altura !== null && (
              <div className="flex justify-between border-b border-slate-200 py-2">
                <dt className="text-slate-500 text-sm">Dimensões (A × L × P)</dt>
                <dd className="font-medium text-sm">
                  {produto.dimensoes_cm.altura} × {produto.dimensoes_cm.largura} × {produto.dimensoes_cm.comprimento} cm
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}
    </article>
  );
}
