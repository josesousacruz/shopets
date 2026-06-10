import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [
  { title: "Trocas e devoluções — Shopets" },
];

export default function Trocas() {
  return (
    <article className="mx-auto max-w-3xl px-4 lg:px-8 py-12 prose prose-slate">
      <h1>Trocas e devoluções</h1>
      <h2>Direito de arrependimento</h2>
      <p>
        Conforme o Código de Defesa do Consumidor (Art. 49), você tem 7 dias corridos a partir do
        recebimento para se arrepender da compra e solicitar a devolução sem precisar justificar.
      </p>
      <h2>Como solicitar</h2>
      <ol>
        <li>Acesse sua conta e abra o pedido em questão.</li>
        <li>Clique em "Solicitar devolução" e descreva o motivo.</li>
        <li>Enviaremos uma etiqueta reversa por e-mail.</li>
        <li>Após recebermos o produto, o estorno é processado em até 10 dias úteis.</li>
      </ol>
      <p className="text-slate-500 italic">
        Texto placeholder — edite <code>storefront/app/routes/institucional.trocas.tsx</code>.
      </p>
    </article>
  );
}
