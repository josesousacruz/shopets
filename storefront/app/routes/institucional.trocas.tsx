import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { InstitucionalLayout } from "~/components/institucional/InstitucionalLayout";

export const meta: MetaFunction = () => [
  { title: "Política de Trocas e Devoluções — Shopets" },
  {
    name: "description",
    content:
      "Política de Trocas e Devoluções da Shopets: direito de arrependimento de 7 dias (CDC art. 49), como solicitar, prazos e condições.",
  },
];

export default function Trocas() {
  return (
    <InstitucionalLayout
      eyebrow="Seus direitos"
      titulo="Política de Trocas e Devoluções"
      subtitulo="Sua satisfação é prioridade. Aqui explicamos, de forma clara, como funcionam as trocas e devoluções na Shopets."
      rascunhoLegal
      atualizadoEm="Junho de 2026"
    >
      <h2>1. Direito de arrependimento (7 dias)</h2>
      <p>
        Conforme o <strong>artigo 49 do Código de Defesa do Consumidor (Lei nº 8.078/1990)</strong>,
        em compras feitas fora do estabelecimento comercial — como pela internet — você pode desistir
        da compra no prazo de <strong>7 (sete) dias corridos</strong>, contados a partir da data do
        recebimento do produto, sem precisar justificar o motivo.
      </p>
      <p>
        Nesse caso, você tem direito à devolução integral dos valores pagos, incluindo o frete,
        devidamente atualizados.
      </p>

      <h2>2. Troca ou devolução por defeito</h2>
      <p>
        Produtos com defeito de fabricação contam com a <strong>garantia legal de 90 dias</strong>{" "}
        (art. 26 do CDC) para produtos duráveis. Identificou um defeito? Solicite a devolução
        descrevendo o problema; após análise, faremos a troca por um item igual, o conserto ou a
        restituição do valor, conforme o caso.
      </p>

      <h2>3. Como solicitar</h2>
      <p>A solicitação é simples e feita inteiramente pela sua conta:</p>
      <ol>
        <li>
          Acesse <Link to="/conta/pedidos">Minha conta → Meus pedidos</Link> e abra o pedido
          desejado.
        </li>
        <li>
          Clique em <strong>"Solicitar devolução"</strong>.
        </li>
        <li>Selecione os itens e a quantidade que deseja devolver.</li>
        <li>Descreva o motivo (arrependimento, defeito, produto errado etc.).</li>
        <li>Envie a solicitação e acompanhe o status pela própria página do pedido.</li>
      </ol>
      <p>
        Nossa equipe analisará o pedido e seguirá com as etapas: <strong>aprovação</strong>,{" "}
        <strong>recebimento</strong> do produto e <strong>reembolso</strong>.
      </p>

      <h2>4. Prazos</h2>
      <ul>
        <li>
          <strong>Solicitação:</strong> até 7 dias corridos após o recebimento (arrependimento) ou
          até 90 dias (defeito).
        </li>
        <li>
          <strong>Análise:</strong> respondemos sua solicitação em até 2 dias úteis.
        </li>
        <li>
          <strong>Reembolso:</strong> processado em até 10 dias úteis após o recebimento e a
          conferência do produto devolvido. O prazo de crédito pode variar conforme a forma de
          pagamento (Pix, estorno no cartão ou na fatura).
        </li>
      </ul>

      <h2>5. Condições do produto</h2>
      <p>Para que a devolução por arrependimento seja aceita, o produto deve estar:</p>
      <ul>
        <li>Sem indícios de uso, em perfeito estado;</li>
        <li>Na embalagem original, com todos os acessórios, manuais e brindes;</li>
        <li>Acompanhado da nota fiscal.</li>
      </ul>
      <p>
        Em caso de defeito, o item pode ser devolvido mesmo após o uso, dentro do prazo de garantia.
      </p>

      <h2>6. Frete da devolução</h2>
      <ul>
        <li>
          <strong>Arrependimento (até 7 dias):</strong> o frete de retorno é por nossa conta —
          enviaremos as instruções de postagem após a aprovação.
        </li>
        <li>
          <strong>Defeito ou erro nosso</strong> (produto trocado, danificado no transporte): o frete
          de retorno também é por nossa conta.
        </li>
      </ul>

      <h2>7. Reembolso</h2>
      <p>
        O reembolso é feito pelo mesmo meio de pagamento utilizado na compra. Pagamentos via Pix são
        devolvidos por Pix; pagamentos no cartão de crédito são estornados na fatura, conforme os
        prazos da administradora.
      </p>

      <h2>8. Dúvidas</h2>
      <p>
        Ficou com alguma dúvida sobre trocas e devoluções? Consulte também nossas{" "}
        <Link to="/institucional/faq">perguntas frequentes</Link> ou fale com nosso atendimento.
        Estamos aqui para ajudar.
      </p>
    </InstitucionalLayout>
  );
}
