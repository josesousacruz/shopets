import type { LoaderFunctionArgs } from "@remix-run/node";
import { api } from "~/lib/api.server";
import { env } from "~/lib/env.server";

export async function loader(_args: LoaderFunctionArgs) {
  const [categorias, produtos] = await Promise.all([
    api.categorias.list(),
    api.produtos.list({ por_pagina: 100 }),
  ]);

  const base = env.siteUrl;
  const urls: { loc: string; lastmod?: string }[] = [
    { loc: `${base}/` },
    { loc: `${base}/loja` },
    { loc: `${base}/institucional/sobre` },
    { loc: `${base}/institucional/faq` },
    { loc: `${base}/institucional/trocas` },
    { loc: `${base}/institucional/privacidade` },
    { loc: `${base}/institucional/termos` },
    ...categorias.data.map((c) => ({ loc: `${base}/loja/${c.slug}` })),
    ...produtos.data.map((p) => ({ loc: `${base}/produto/${p.slug}` })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc></url>`).join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
