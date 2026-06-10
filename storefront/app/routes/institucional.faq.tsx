import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { InstitucionalLayout } from "~/components/institucional/InstitucionalLayout";

export const meta: MetaFunction = () => [
  { title: "Perguntas frequentes — Shopets" },
  {
    name: "description",
    content:
      "Tire suas dúvidas sobre prazos de entrega, formas de pagamento, rastreamento, retirada na loja, garantia e devoluções na Shopets.",
  },
];

export default function Faq() {
  return (
    <InstitucionalLayout
      eyebrow="Ajuda"
      titulo="Perguntas frequentes"
      subtitulo="Reunimos as dúvidas mais comuns sobre compras, entrega, pagamento e devoluções. Não achou o que procurava? Fale com nosso atendimento."
    >
      <h2>Quanto tempo demora a entrega?</h2>
      <p>
        O prazo depende do seu CEP e do serviço escolhido no checkout (PAC ou SEDEX). Antes de
        finalizar a compra você calcula o frete e vê o prazo estimado em dias úteis. O relógio começa
        a contar a partir da confirmação do pagamento e da separação do pedido.
      </p>

      <h2>Quais formas de pagamento vocês aceitam?</h2>
      <p>
        Aceitamos <strong>Pix</strong> (aprovação na hora), <strong>cartão de crédito</strong> e{" "}
        <strong>boleto bancário</strong>. No Pix o pagamento é confirmado em segundos; no boleto a
        compensação pode levar de 1 a 2 dias úteis.
      </p>

      <h2>Como acompanho o meu pedido?</h2>
      <p>
        É só entrar em <Link to="/conta/pedidos">Meus pedidos</Link>. Lá você vê o status atual
        (aguardando pagamento, em separação, enviado, entregue) e, assim que o pedido for despachado,
        o código de rastreio dos Correios fica disponível para acompanhar a entrega.
      </p>

      <h2>Posso retirar na loja?</h2>
      <p>
        Sim. No checkout, escolha a opção <strong>Retirar na loja</strong>, selecione a unidade mais
        perto de você e decida se prefere pagar online (Pix) ou no balcão, na hora da retirada.
        Avisaremos quando o pedido estiver separado e pronto para ser buscado.
      </p>

      <h2>Posso pagar na hora de retirar?</h2>
      <p>
        Pode. Ao optar por retirada na loja, existe a opção <strong>pagar na retirada</strong>: o
        pedido fica reservado e você quita o valor diretamente no balcão quando for buscar.
      </p>

      <h2>Os produtos têm garantia?</h2>
      <p>
        Todos os produtos têm a <strong>garantia legal de 90 dias</strong> contra defeitos de
        fabricação, prevista no Código de Defesa do Consumidor, além da garantia do fabricante quando
        houver. Se o produto apresentar defeito, entre em contato que orientamos a troca ou o
        conserto.
      </p>

      <h2>Como faço uma troca ou devolução?</h2>
      <p>
        Você tem <strong>7 dias corridos após o recebimento</strong> para se arrepender da compra
        (direito previsto no CDC). A solicitação é feita pela sua conta, na página do pedido, em
        "Solicitar devolução". Veja todas as regras na nossa{" "}
        <Link to="/institucional/trocas">Política de Trocas e Devoluções</Link>.
      </p>

      <h2>Recebi um produto com defeito ou errado. E agora?</h2>
      <p>
        Pedimos desculpas pelo transtorno. Solicite a devolução pela página do pedido descrevendo o
        problema no campo de motivo. Em casos de defeito ou erro nosso, o frete de retorno é por
        nossa conta.
      </p>

      <h2>A capa serve no meu modelo de celular?</h2>
      <p>
        Cada produto indica os modelos compatíveis na descrição. Em caso de dúvida sobre o encaixe do
        seu aparelho, fale com o atendimento antes de comprar — ajudamos você a escolher a opção
        certa.
      </p>

      <h2>Comprar na Shopets é seguro?</h2>
      <p>
        Sim. O site utiliza conexão criptografada e seus dados de pagamento são processados por
        gateways seguros — não armazenamos os dados completos do seu cartão. Tratamos suas
        informações conforme a LGPD; saiba mais na nossa{" "}
        <Link to="/institucional/privacidade">Política de Privacidade</Link>.
      </p>
    </InstitucionalLayout>
  );
}
