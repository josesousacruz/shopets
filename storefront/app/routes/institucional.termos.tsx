import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [{ title: "Termos de uso — Shopets" }];

export default function Termos() {
  return (
    <article className="mx-auto max-w-3xl px-4 lg:px-8 py-12 prose prose-slate">
      <h1>Termos de uso</h1>
      <p>
        Ao acessar e utilizar a loja Shopets, você concorda com estes termos. Leia com atenção.
      </p>
      <h2>Sobre o serviço</h2>
      <p>
        A Shopets opera como ecommerce de acessórios para celular. Os preços e disponibilidade
        podem mudar a qualquer momento sem aviso prévio.
      </p>
      <h2>Limitação de responsabilidade</h2>
      <p>
        Não nos responsabilizamos por danos indiretos decorrentes do uso ou indisponibilidade do site.
      </p>
      <p className="text-slate-500 italic">
        Texto placeholder — edite <code>storefront/app/routes/institucional.termos.tsx</code>.
      </p>
    </article>
  );
}
