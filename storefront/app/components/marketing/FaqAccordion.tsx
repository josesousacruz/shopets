import { Plus } from "lucide-react";

const ITEMS = [
  {
    q: "Qual o prazo de entrega?",
    a: "Após a confirmação do pagamento, o pedido é postado em até 1 dia útil. O prazo de entrega varia conforme a região, geralmente de 3 a 8 dias úteis, com código de rastreio enviado por e-mail.",
  },
  {
    q: "Quais as formas de pagamento?",
    a: "Aceitamos Pix (com 5% de desconto à vista), cartão de crédito em até 12x e boleto bancário. O pagamento é processado em ambiente seguro.",
  },
  {
    q: "Posso trocar ou devolver o produto?",
    a: "Sim. Você tem 7 dias corridos após o recebimento para solicitar a troca ou devolução, conforme o Código de Defesa do Consumidor. É só falar com a gente.",
  },
  {
    q: "Como acompanho o rastreamento do pedido?",
    a: "Assim que o pedido é despachado, enviamos o código de rastreio por e-mail. Você também consegue acompanhar o status direto na sua conta, na área de pedidos.",
  },
  {
    q: "Os acessórios servem no meu modelo de celular?",
    a: "Cada produto traz na descrição os modelos compatíveis (iPhone, Samsung, Xiaomi, Motorola e outros). Em caso de dúvida, fale com o nosso atendimento antes de comprar.",
  },
];

export function FaqAccordion() {
  return (
    <div className="faq-row">
      <div>
        <h2>Perguntas frequentes</h2>
        <p className="lead">
          As dúvidas que mais aparecem antes da compra. Se a sua não estiver aqui, é só
          falar com a gente.
        </p>
      </div>
      <div>
        {ITEMS.map((item, i) => (
          <details className="item" key={item.q} open={i === 0}>
            <summary>
              {item.q}
              <Plus className="size-[18px]" strokeWidth={2.2} />
            </summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
