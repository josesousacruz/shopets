import { env } from "~/lib/env.server";

export async function loader() {
  const body = `User-agent: *
Allow: /
Disallow: /carrinho
Disallow: /checkout
Disallow: /conta

Sitemap: ${env.siteUrl}/sitemap.xml
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain" },
  });
}
