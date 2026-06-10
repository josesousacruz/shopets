import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [
  { title: "Shopets — capas e acessórios pro seu celular" },
];

export default function Index() {
  return (
    <section className="mx-auto max-w-7xl px-4 lg:px-8 py-16">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
        Storefront em construção
      </h1>
      <p className="mt-4 text-slate-600 max-w-prose">
        Estamos preparando a loja. Em breve você verá nossas capas, películas, carregadores e fones aqui.
      </p>
    </section>
  );
}
