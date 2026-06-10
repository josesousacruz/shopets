import type { PedidoStatus } from "~/types/api";

/** Rótulos pt-BR para o status do pedido. */
export const STATUS_LABEL: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

/** Sequência feliz do pedido (cancelado é tratado à parte). */
export const STATUS_FLUXO: PedidoStatus[] = [
  "aguardando_pagamento",
  "pago",
  "em_separacao",
  "enviado",
  "entregue",
];

export const STATUS_SUB: Record<string, string> = {
  aguardando_pagamento: "Pagamento será habilitado em breve.",
  pago: "Pagamento confirmado.",
  em_separacao: "Estamos preparando seu pedido.",
  enviado: "Seu pedido está a caminho.",
  entregue: "Pedido entregue.",
};
