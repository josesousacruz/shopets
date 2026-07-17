import type { PedidoStatus } from "~/types/api";

/** Rótulos pt-BR para o status do pedido. */
export const STATUS_LABEL: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  aguardando_retirada: "Aguardando retirada",
  pago: "Pago",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
  aguardando_revisao_fiscal: "Revisão fiscal pendente",
};

/** Rótulos pt-BR para o status da devolução. */
export const DEVOLUCAO_LABEL: Record<string, string> = {
  solicitada: "Solicitada",
  aprovada: "Aprovada",
  recebida: "Recebida",
  reembolsada: "Reembolsada",
  rejeitada: "Rejeitada",
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
