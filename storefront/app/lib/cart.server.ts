import { createCookie } from "@remix-run/node";
import { env } from "./env.server";
import { getToken } from "./session.server";
import { ApiValidationError } from "./auth.server";
import type { Carrinho, CupomAplicado, Devolucao, FreteOpcao, PagamentoPix, Pedido, PontoRetirada } from "~/types/api";

/* ──────────────────────────────────────────────────────────
   Cookie httpOnly separado para o token de carrinho convidado.
   ────────────────────────────────────────────────────────── */
const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "dev-secret-shopets-troque-em-producao";

export const cartCookie = createCookie("cart_token", {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
  secrets: [SESSION_SECRET],
  maxAge: 60 * 60 * 24 * 30, // 30 dias
});

/** Lê o token de carrinho convidado do cookie (ou null). */
export async function getCartToken(request: Request): Promise<string | null> {
  const value = await cartCookie.parse(request.headers.get("Cookie"));
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Serializa o Set-Cookie para persistir o token de carrinho. */
export function setCartToken(token: string): Promise<string> {
  return cartCookie.serialize(token);
}

/* ──────────────────────────────────────────────────────────
   Cliente HTTP do carrinho — envia X-Cart-Token (convidado)
   e Bearer (cliente logado) quando disponíveis.
   ────────────────────────────────────────────────────────── */
type Json = Record<string, unknown>;

interface CartRequestOpts {
  method?: string;
  body?: Json;
  bearer?: string | null;
  cartToken?: string | null;
}

async function cartRequest<T>(path: string, opts: CartRequestOpts = {}): Promise<T> {
  const { method = "GET", body, bearer, cartToken } = opts;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
  if (cartToken) headers["X-Cart-Token"] = cartToken;

  const res = await fetch(env.apiBaseUrl + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  if (res.status === 422) {
    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
      errors?: Record<string, string[]>;
    };
    throw new ApiValidationError(422, data.message ?? "Dados inválidos.", data.errors ?? {});
  }

  if (!res.ok) {
    throw new ApiValidationError(res.status, `API ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}

/* ── Carrinho ─────────────────────────────────────────── */

/**
 * Obtém o carrinho. Sempre retorna os dados; se a API gerou um novo token
 * (carrinho convidado novo), devolve também `setCookie` para persistir.
 */
export async function fetchCarrinho(request: Request): Promise<{
  carrinho: Carrinho;
  setCookie?: string;
}> {
  const bearer = await getToken(request);
  const cartToken = await getCartToken(request);

  const { data } = await cartRequest<{ data: Carrinho }>("/carrinho", { bearer, cartToken });

  // Para convidado: persistir o token quando for novo/diferente.
  let setCookie: string | undefined;
  if (!bearer && data.token && data.token !== cartToken) {
    setCookie = await setCartToken(data.token);
  }

  return { carrinho: data, setCookie };
}

export async function adicionarItem(
  request: Request,
  payload: { id_produto: number; id_variacao?: number | null; quantidade: number },
): Promise<{ data: Carrinho }> {
  const bearer = await getToken(request);
  const cartToken = await getCartToken(request);
  return cartRequest<{ data: Carrinho }>("/carrinho/itens", {
    method: "POST",
    bearer,
    cartToken,
    body: payload as Json,
  });
}

export async function atualizarItem(
  request: Request,
  id: number,
  quantidade: number,
): Promise<{ data: Carrinho }> {
  const bearer = await getToken(request);
  const cartToken = await getCartToken(request);
  return cartRequest<{ data: Carrinho }>(`/carrinho/itens/${id}`, {
    method: "PUT",
    bearer,
    cartToken,
    body: { quantidade },
  });
}

export async function removerItem(request: Request, id: number): Promise<{ data: Carrinho }> {
  const bearer = await getToken(request);
  const cartToken = await getCartToken(request);
  return cartRequest<{ data: Carrinho }>(`/carrinho/itens/${id}`, {
    method: "DELETE",
    bearer,
    cartToken,
  });
}

/* ── Cupom ────────────────────────────────────────────── */

/**
 * Aplica um cupom ao carrinho atual: POST /carrinho/cupom {codigo}.
 * Em caso de cupom inválido a API responde 422 — propagamos via ApiValidationError.
 */
export async function aplicarCupom(
  request: Request,
  codigo: string,
): Promise<{ data: CupomAplicado }> {
  const bearer = await getToken(request);
  const cartToken = await getCartToken(request);
  return cartRequest<{ data: CupomAplicado }>("/carrinho/cupom", {
    method: "POST",
    bearer,
    cartToken,
    body: { codigo },
  });
}

/** Remove o cupom do carrinho: DELETE /carrinho/cupom. */
export async function removerCupom(request: Request): Promise<{ data: { codigo: null } }> {
  const bearer = await getToken(request);
  const cartToken = await getCartToken(request);
  return cartRequest<{ data: { codigo: null } }>("/carrinho/cupom", {
    method: "DELETE",
    bearer,
    cartToken,
  });
}

/* ── Frete ────────────────────────────────────────────── */

export async function cotarFrete(
  request: Request,
  payload: { cep: string; itens?: { id_produto: number; id_variacao?: number | null; quantidade: number }[] },
): Promise<{ data: FreteOpcao[] }> {
  const bearer = await getToken(request);
  const cartToken = await getCartToken(request);
  return cartRequest<{ data: FreteOpcao[] }>("/frete/cotar", {
    method: "POST",
    bearer,
    cartToken,
    body: payload as Json,
  });
}

/* ── Pontos de retirada ───────────────────────────────── */

/** Lista pública de PDVs habilitados para retirada (nome, endereço, telefone). */
export async function listarPontosRetirada(): Promise<{ data: PontoRetirada[] }> {
  return cartRequest<{ data: PontoRetirada[] }>("/pontos-retirada");
}

/* ── Checkout ─────────────────────────────────────────── */

export async function iniciarCheckout(
  request: Request,
  bearer: string,
  payload: {
    modalidade: "entrega" | "retirada";
    id_endereco?: number | null;
    id_pdv?: number | null;
    pagamento_modo?: "online" | "na_retirada" | null;
    frete_servico?: string | null;
    cep?: string | null;
  },
): Promise<{ data: Pedido }> {
  const cartToken = await getCartToken(request);
  return cartRequest<{ data: Pedido }>("/checkout/iniciar", {
    method: "POST",
    bearer,
    cartToken,
    body: payload as Json,
  });
}

/* ── Pedidos ──────────────────────────────────────────── */

export async function listarPedidos(bearer: string): Promise<{ data: Pedido[] }> {
  return cartRequest<{ data: Pedido[] }>("/pedidos", { bearer });
}

export async function obterPedido(bearer: string, numero: string): Promise<{ data: Pedido }> {
  return cartRequest<{ data: Pedido }>(`/pedidos/${encodeURIComponent(numero)}`, { bearer });
}

/* ── Devoluções (cliente) ─────────────────────────────── */

/** Lista as devoluções do próprio pedido: GET /pedidos/{numero}/devolucoes. */
export async function listarDevolucoes(
  bearer: string,
  numero: string,
): Promise<{ data: Devolucao[] }> {
  return cartRequest<{ data: Devolucao[] }>(
    `/pedidos/${encodeURIComponent(numero)}/devolucoes`,
    { bearer },
  );
}

/** Solicita devolução: POST /pedidos/{numero}/devolucao {itens, motivo}. */
export async function solicitarDevolucao(
  bearer: string,
  numero: string,
  payload: { itens: { id_pedido_item: number; quantidade: number }[]; motivo: string },
): Promise<{ data: Devolucao }> {
  return cartRequest<{ data: Devolucao }>(
    `/pedidos/${encodeURIComponent(numero)}/devolucao`,
    { method: "POST", bearer, body: payload as unknown as Json },
  );
}

/* ── Pagamento ────────────────────────────────────────── */

/** Gera a cobrança Pix do pedido: POST /pedidos/{numero}/pagar {metodo}. */
export async function pagarPedido(
  bearer: string,
  numero: string,
  metodo: "pix" = "pix",
): Promise<PagamentoPix> {
  return cartRequest<PagamentoPix>(`/pedidos/${encodeURIComponent(numero)}/pagar`, {
    method: "POST",
    bearer,
    body: { metodo },
  });
}

/** Dev only: simula a aprovação do pagamento no gateway. */
export async function simularAprovacao(bearer: string, gatewayId: string): Promise<unknown> {
  return cartRequest<unknown>(`/dev/pagamentos/${encodeURIComponent(gatewayId)}/aprovar`, {
    method: "POST",
    bearer,
  });
}
