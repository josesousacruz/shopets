import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { InstitucionalLayout } from "~/components/institucional/InstitucionalLayout";

export const meta: MetaFunction = () => [
  { title: "Termos de Uso — Shopets" },
  {
    name: "description",
    content:
      "Termos de Uso da loja Shopets: regras de uso do site, conta, pedidos, pagamento, propriedade intelectual e foro.",
  },
];

export default function Termos() {
  return (
    <InstitucionalLayout
      eyebrow="Condições gerais"
      titulo="Termos de Uso"
      subtitulo="Ao acessar e utilizar a loja Shopets, você concorda com estes Termos de Uso. Recomendamos a leitura atenta antes de finalizar uma compra."
      rascunhoLegal
      atualizadoEm="Junho de 2026"
    >
      <h2>1. Aceitação</h2>
      <p>
        Estes Termos regem o uso do site e dos serviços da Shopets. Ao navegar, criar uma conta ou
        comprar, você declara ter lido, compreendido e aceitado integralmente estas condições. Caso
        não concorde, por favor não utilize a loja.
      </p>

      <h2>2. Uso do site</h2>
      <p>
        Você se compromete a usar o site de forma lícita e a não praticar atos que possam danificar,
        sobrecarregar ou comprometer a segurança da plataforma, nem violar direitos de terceiros. É
        proibido o uso de robôs ou meios automatizados para coletar dados ou realizar compras de
        forma fraudulenta.
      </p>

      <h2>3. Conta de usuário</h2>
      <p>
        Para comprar, você pode criar uma conta com informações verdadeiras e atualizadas. Você é
        responsável por manter a confidencialidade da sua senha e por todas as atividades realizadas
        na sua conta. Notifique-nos imediatamente em caso de uso não autorizado.
      </p>

      <h2>4. Produtos, preços e disponibilidade</h2>
      <p>
        Empenhamo-nos para que as informações de produtos, fotos e preços estejam corretas. Contudo,
        preços e disponibilidade podem mudar a qualquer momento sem aviso prévio. Em caso de erro
        evidente de preço ou indisponibilidade após a compra, entraremos em contato e poderemos
        cancelar o pedido, com reembolso integral.
      </p>

      <h2>5. Pedidos</h2>
      <p>
        O pedido se concretiza após a confirmação do pagamento. Reservamo-nos o direito de recusar ou
        cancelar pedidos em casos de suspeita de fraude, erro de cadastro ou indisponibilidade de
        estoque, sempre com a devida comunicação e reembolso quando cabível.
      </p>

      <h2>6. Pagamento</h2>
      <p>
        Aceitamos Pix, cartão de crédito e boleto. As transações são processadas por gateways de
        pagamento seguros. A aprovação do pagamento está sujeita às regras das instituições
        financeiras e operadoras de cartão.
      </p>

      <h2>7. Entrega e retirada</h2>
      <p>
        A entrega é feita pelos Correios para todo o Brasil, no prazo calculado no checkout. Também
        oferecemos a opção de retirada na loja. Os prazos começam a contar após a confirmação do
        pagamento e a separação do pedido.
      </p>

      <h2>8. Trocas e devoluções</h2>
      <p>
        As regras de troca, devolução e direito de arrependimento estão detalhadas na nossa{" "}
        <Link to="/institucional/trocas">Política de Trocas e Devoluções</Link>, em conformidade com
        o Código de Defesa do Consumidor.
      </p>

      <h2>9. Propriedade intelectual</h2>
      <p>
        Todo o conteúdo do site — marca, logotipo, textos, imagens e layout — pertence à Shopets ou a
        seus licenciadores e é protegido por lei. É vedada a reprodução, distribuição ou uso sem
        autorização prévia e por escrito.
      </p>

      <h2>10. Limitação de responsabilidade</h2>
      <p>
        A Shopets não se responsabiliza por danos indiretos decorrentes de indisponibilidade
        temporária do site, falhas de terceiros (transportadoras, gateways) ou uso indevido da
        plataforma, ressalvadas as responsabilidades previstas em lei.
      </p>

      <h2>11. Privacidade</h2>
      <p>
        O tratamento dos seus dados pessoais segue a nossa{" "}
        <Link to="/institucional/privacidade">Política de Privacidade</Link>, elaborada conforme a
        LGPD.
      </p>

      <h2>12. Alterações destes Termos</h2>
      <p>
        Podemos atualizar estes Termos a qualquer momento. A versão vigente é sempre a publicada nesta
        página, com a data da última atualização indicada ao final.
      </p>

      <h2>13. Foro</h2>
      <p>
        Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro do domicílio do
        consumidor para dirimir eventuais controvérsias, conforme o Código de Defesa do Consumidor.
      </p>
    </InstitucionalLayout>
  );
}
