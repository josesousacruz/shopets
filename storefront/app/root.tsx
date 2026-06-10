import type { LinksFunction, MetaFunction } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { Header } from "~/components/layout/Header";
import { Footer } from "~/components/layout/Footer";
import { AnalyticsScripts } from "~/lib/tracking";
import { env } from "~/lib/env.server";
import { getCliente } from "~/lib/session.server";
import tailwind from "~/tailwind.css?url";

export async function loader({ request }: { request: Request }) {
  const cliente = await getCliente(request);
  return { ga4Id: env.ga4Id, metaPixelId: env.metaPixelId, cliente };
}

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwind },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=Montserrat:wght@500;700&display=swap",
  },
  { rel: "manifest", href: "/manifest.json" },
  { rel: "icon", href: "/icons/icon-192.svg", type: "image/svg+xml" },
];

export const meta: MetaFunction = () => [
  { title: "Shopets — capas e acessórios pro seu celular" },
  { name: "description", content: "Capas, películas, carregadores e fones com entrega rápida." },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof loader>() as { ga4Id?: string; metaPixelId?: string } | undefined;
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#7c3aed" />
        <Meta />
        <Links />
        <AnalyticsScripts ga4={data?.ga4Id} pixel={data?.metaPixelId} />
      </head>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
