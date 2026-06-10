import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [{ title: "Política de privacidade — Shopets" }];

export default function Privacidade() {
  return (
    <article className="mx-auto max-w-3xl px-4 lg:px-8 py-12 prose prose-slate">
      <h1>Política de privacidade</h1>
      <p>
        A Shopets respeita sua privacidade e está em conformidade com a Lei Geral de Proteção de
        Dados (LGPD). Coletamos apenas os dados necessários para processar sua compra: nome, CPF,
        e-mail, telefone e endereço de entrega.
      </p>
      <h2>Compartilhamento</h2>
      <p>
        Compartilhamos dados apenas com parceiros de logística (transportadoras) e pagamento
        (gateways) quando necessário para concluir sua compra.
      </p>
      <h2>Seus direitos</h2>
      <p>
        Você pode solicitar a qualquer momento o acesso, correção ou exclusão dos seus dados
        enviando um e-mail para <a href="mailto:contato@shopets.com.br">contato@shopets.com.br</a>.
      </p>
      <p className="text-slate-500 italic">
        Texto placeholder — edite <code>storefront/app/routes/institucional.privacidade.tsx</code>.
      </p>
    </article>
  );
}
