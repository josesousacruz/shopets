import type { MetaFunction } from "@remix-run/node";
import { InstitucionalLayout } from "~/components/institucional/InstitucionalLayout";

export const meta: MetaFunction = () => [
  { title: "Sobre — Shopets" },
  {
    name: "description",
    content:
      "Conheça a Shopets: loja brasileira de capas, películas e acessórios para celular, com entrega rápida e atendimento de verdade.",
  },
];

export default function Sobre() {
  return (
    <InstitucionalLayout
      eyebrow="Quem somos"
      titulo="Sobre a Shopets"
      subtitulo="A loja que protege o seu celular com capricho — capas, películas e acessórios escolhidos a dedo, com entrega rápida e atendimento gente como a gente."
    >
      <p className="lead">
        A Shopets nasceu de uma ideia simples: ninguém deveria perder tempo (nem dinheiro) com capa
        que não encaixa, película que descasca ou carregador que esquenta. A gente seleciona cada
        produto pensando em quem usa o celular o dia inteiro — para trabalhar, estudar, fotografar e
        viver.
      </p>

      <h2>O que vendemos</h2>
      <p>
        Somos especializados em capas e acessórios para celular. No nosso catálogo você encontra:
      </p>
      <ul>
        <li>
          <strong>Capas</strong> — de silicone, antichoque, transparentes e estilosas, sob medida
          para iPhone, Samsung Galaxy, Xiaomi/Redmi e Motorola.
        </li>
        <li>
          <strong>Películas</strong> de vidro temperado e hidrogel, com proteção contra riscos e
          quedas.
        </li>
        <li>
          <strong>Carregadores e cabos</strong> originais e certificados, incluindo carga rápida e
          USB-C.
        </li>
        <li>
          <strong>Fones, caixas de som e suportes</strong> para completar o setup do seu dia a dia.
        </li>
      </ul>

      <h2>Como trabalhamos</h2>
      <p>
        Nossa operação une um estoque físico bem cuidado a uma loja online ágil. Isso significa que o
        produto que você vê no site está realmente disponível, e que o pedido sai rápido depois da
        confirmação do pagamento.
      </p>
      <ul>
        <li>
          <strong>Entrega rápida para todo o Brasil</strong> pelos Correios (PAC e SEDEX), com prazo
          calculado pelo seu CEP antes de fechar a compra.
        </li>
        <li>
          <strong>Retirada na loja</strong> para quem é da região e prefere buscar pessoalmente — e,
          se quiser, pagar no balcão.
        </li>
        <li>
          <strong>Pagamento seguro</strong> via Pix e cartão, com seus dados protegidos.
        </li>
      </ul>

      <h2>Atendimento de verdade</h2>
      <p>
        Por trás da loja tem gente. Se ficou em dúvida sobre qual capa serve no seu modelo, se o
        pedido atrasou ou se precisa trocar algo, fale com a gente — respondemos de forma clara e
        resolvemos o que estiver ao nosso alcance. A confiança de quem compra é o que mantém a
        Shopets de pé.
      </p>

      <h2>Nosso compromisso</h2>
      <p>
        Produtos de qualidade, preço justo, prazos cumpridos e respeito total aos seus direitos como
        consumidor — incluindo o direito de arrependimento previsto no Código de Defesa do
        Consumidor. Comprou e não gostou? A gente resolve.
      </p>
    </InstitucionalLayout>
  );
}
