import type { ProdutoDetalhe } from "~/types/api";

export function jsonLdProduct(produto: ProdutoDetalhe, siteUrl: string) {
  const preco = produto.preco_promocional ?? produto.preco_venda;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: produto.nome,
    description: produto.seo.description ?? produto.descricao_curta ?? "",
    image: produto.galeria[0]?.url_large ?? produto.seo.og_image ?? undefined,
    sku: produto.id.toString(),
    category: produto.categoria?.nome,
    brand: { "@type": "Brand", name: "Shopets" },
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/produto/${produto.slug}`,
      priceCurrency: "BRL",
      price: preco.toFixed(2),
      availability: produto.disponivel
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
}

export function jsonLdBreadcrumb(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((i, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: i.name,
      item: i.url,
    })),
  };
}

export function jsonLdScript(data: object) {
  return {
    type: "application/ld+json",
    children: JSON.stringify(data),
  };
}
