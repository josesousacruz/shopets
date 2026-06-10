import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [
  { title: "Perguntas frequentes — Shopets" },
];

const FAQ = [
  { q: "Quanto tempo demora a entrega?", a: "O prazo varia conforme o CEP de destino e o serviço escolhido no checkout (PAC, SEDEX, etc)." },
  { q: "Posso retirar na loja?", a: "Sim. Ao finalizar a compra, escolha a opção de retirada." },
  { q: "Quais formas de pagamento vocês aceitam?", a: "Pix, cartão de crédito e boleto." },
  { q: "Como faço uma troca ou devolução?", a: "Você tem 7 dias após o recebimento para solicitar a devolução pelo seu painel de pedidos." },
];

export default function Faq() {
  return (
    <article className="mx-auto max-w-3xl px-4 lg:px-8 py-12">
      <h1 className="font-display font-extrabold text-3xl mb-8">Perguntas frequentes</h1>
      <dl className="space-y-6">
        {FAQ.map((item) => (
          <div key={item.q}>
            <dt className="font-semibold text-ink">{item.q}</dt>
            <dd className="mt-1 text-slate-600">{item.a}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-12 text-slate-400 italic text-sm">
        Texto placeholder — edite <code>storefront/app/routes/institucional.faq.tsx</code>.
      </p>
    </article>
  );
}
