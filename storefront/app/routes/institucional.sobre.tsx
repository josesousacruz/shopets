import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [
  { title: "Sobre — Shopets" },
  { name: "description", content: "Conheça a Shopets, sua loja de capas e acessórios para celular." },
];

export default function Sobre() {
  return (
    <article className="mx-auto max-w-3xl px-4 lg:px-8 py-12 prose prose-slate">
      <h1>Sobre a Shopets</h1>
      <p>
        A Shopets é uma loja brasileira especializada em capas e acessórios para celular.
        Trabalhamos com capas, películas, carregadores, cabos, fones de ouvido, caixas de som e
        suportes para os principais modelos de iPhone, Samsung, Xiaomi e Motorola.
      </p>
      <p className="text-slate-500 italic">
        Texto placeholder — edite este arquivo em <code>storefront/app/routes/institucional.sobre.tsx</code>.
      </p>
    </article>
  );
}
