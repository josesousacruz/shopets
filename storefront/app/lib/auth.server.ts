import { env } from "./env.server";
import type {
  AuthResposta,
  CepResultado,
  Cliente,
  Endereco,
} from "~/types/api";

/** Erro de validação (422) carregando os erros por campo, para os forms exibirem. */
export class ApiValidationError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiValidationError";
  }
}

type Json = Record<string, unknown>;

interface RequestOpts {
  method?: string;
  body?: Json;
  token?: string | null;
  /** Aceitar 404 como null em vez de lançar (usado no CEP). */
  allow404?: boolean;
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = "GET", body, token, allow404 } = opts;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(env.apiBaseUrl + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  if (allow404 && res.status === 404) {
    throw new ApiValidationError(404, "Não encontrado", {});
  }

  if (res.status === 422) {
    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
      errors?: Record<string, string[]>;
    };
    throw new ApiValidationError(
      422,
      data.message ?? "Dados inválidos.",
      data.errors ?? {},
    );
  }

  if (!res.ok) {
    throw new ApiValidationError(res.status, `API ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}

/* ── Auth ─────────────────────────────────────────────── */

export function register(data: {
  nome: string;
  email: string;
  password: string;
  password_confirmation: string;
  aceita_marketing?: boolean;
}): Promise<AuthResposta> {
  return request<AuthResposta>("/auth/register", { method: "POST", body: data });
}

export function login(data: {
  email: string;
  password: string;
}): Promise<AuthResposta> {
  return request<AuthResposta>("/auth/login", { method: "POST", body: data });
}

export function logoutApi(token: string): Promise<void> {
  return request<void>("/auth/logout", { method: "POST", token });
}

export function me(token: string): Promise<{ data: Cliente }> {
  return request<{ data: Cliente }>("/auth/me", { token });
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return request<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export function resetPassword(data: {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<{ message: string }> {
  return request<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: data,
  });
}

/* ── CEP ──────────────────────────────────────────────── */

export function consultaCep(cep: string): Promise<CepResultado> {
  const limpo = cep.replace(/\D/g, "");
  return request<CepResultado>(`/cep/${limpo}`, { allow404: true });
}

/* ── Endereços ────────────────────────────────────────── */

export function listarEnderecos(token: string): Promise<{ data: Endereco[] }> {
  return request<{ data: Endereco[] }>("/enderecos", { token });
}

export function criarEndereco(
  token: string,
  data: Partial<Endereco>,
): Promise<{ data: Endereco }> {
  return request<{ data: Endereco }>("/enderecos", {
    method: "POST",
    token,
    body: data as Json,
  });
}

export function atualizarEndereco(
  token: string,
  id: number,
  data: Partial<Endereco>,
): Promise<{ data: Endereco }> {
  return request<{ data: Endereco }>(`/enderecos/${id}`, {
    method: "PUT",
    token,
    body: data as Json,
  });
}

export function removerEndereco(token: string, id: number): Promise<void> {
  return request<void>(`/enderecos/${id}`, { method: "DELETE", token });
}
