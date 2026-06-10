import { env } from "./env.server";

/** Erro de validação (422) carregando os erros por campo, para os forms exibirem. */
export class PainelValidationError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "PainelValidationError";
  }
}

type Json = Record<string, unknown>;

interface RequestOpts {
  method?: string;
  body?: Json;
  token?: string | null;
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = "GET", body, token } = opts;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(env.apiBaseUrl + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return parse<T>(res, path);
}

async function parse<T>(res: Response, path: string): Promise<T> {
  if (res.status === 204) return undefined as T;

  if (res.status === 422) {
    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
      errors?: Record<string, string[]>;
    };
    throw new PainelValidationError(422, data.message ?? "Dados inválidos.", data.errors ?? {});
  }

  if (res.status === 401 || res.status === 403) {
    throw new PainelValidationError(res.status, "Sessão inválida.", {});
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new PainelValidationError(res.status, data.message ?? `API ${res.status}: ${path}`, {});
  }

  return res.json() as Promise<T>;
}

/* ── Tipos ─────────────────────────────────────────────── */

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  nivel_acesso: string;
}

export interface Meta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PedidoLinha {
  numero: string;
  cliente: string;
  cliente_email: string | null;
  data: string | null;
  modalidade: string | null;
  total: number;
  status: string;
  itens_count: number;
}

export interface PedidoDetalhe {
  numero: string;
  status: string;
  modalidade: string | null;
  subtotal: number;
  frete: number;
  desconto: number;
  total: number;
  frete_servico: string | null;
  prazo_entrega_dias: number | null;
  codigo_rastreio: string | null;
  observacoes: string | null;
  criado_em: string | null;
  pago_em: string | null;
  enviado_em: string | null;
  entregue_em: string | null;
  cancelado_em: string | null;
  nfe_numero: string | null;
  nfe_chave: string | null;
  cliente: { nome: string; email: string; telefone: string | null; cpf_cnpj: string | null } | null;
  endereco: {
    logradouro: string;
    numero: string | null;
    complemento: string | null;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  } | null;
  itens: { nome: string; sku: string | null; preco_unit: number; quantidade: number; subtotal: number }[];
  pagamento: { metodo: string; status: string; valor: number; gateway: string | null; processado_em: string | null } | null;
  venda: { numero: string } | null;
  eventos: { tipo: string; descricao: string | null; criado_em: string | null }[];
}

export interface ProdutoLinha {
  id: number;
  nome: string;
  slug: string;
  preco_venda: number;
  preco_promocional: number | null;
  estoque_atual: number | null;
  ativo: boolean;
  visivel_ecommerce: boolean;
  categoria: string | null;
  thumb: string | null;
}

export interface VariacaoAdmin {
  id: number;
  sku: string;
  nome_variacao: string | null;
  atributos: Record<string, string>;
  preco_venda: number;
  preco_promocional: number | null;
  estoque_atual: number;
  estoque_minimo: number;
  ativo: boolean;
}

export interface GaleriaFoto {
  id: number;
  url: string;
  url_thumb: string;
  url_medium: string;
  url_large: string;
  ordem: number;
}

export interface ProdutoDetalheAdmin {
  id: number;
  nome: string;
  slug: string;
  descricao_curta: string | null;
  descricao_longa: string | null;
  preco_custo: number | null;
  preco_venda: number;
  preco_promocional: number | null;
  id_categoria: number | null;
  categoria: string | null;
  peso_gramas: number | null;
  altura_cm: number | null;
  largura_cm: number | null;
  comprimento_cm: number | null;
  meta_title: string | null;
  meta_description: string | null;
  destaque: boolean;
  novo: boolean;
  em_promocao: boolean;
  visivel_ecommerce: boolean;
  ativo: boolean;
  estoque_atual: number | null;
  estoque_minimo: number | null;
  variacoes: VariacaoAdmin[];
  galeria: GaleriaFoto[];
}

export interface CategoriaAdmin {
  id: number;
  nome: string;
  slug: string;
  descricao_seo: string | null;
  ordem: number;
  visivel_ecommerce: boolean;
  ativo: boolean;
  id_categoria_pai: number | null;
}

export interface ConfiguracoesPainel {
  loja: {
    nome_empresa: string | null;
    cnpj: string | null;
    endereco: string | null;
    telefone: string | null;
    email: string | null;
    logo_path: string | null;
    taxa_entrega: number;
    valor_minimo_entrega: number;
  };
  integracoes: {
    payment_driver: string | null;
    shipping_driver: string | null;
  };
}

/* ── Cliente da API admin ──────────────────────────────── */

export const painel = {
  auth: {
    login: (body: { email: string; password: string }) =>
      request<{ user: AdminUser; token: string }>("/painel/auth/login", { method: "POST", body }),
    logout: (token: string) => request<void>("/painel/auth/logout", { method: "POST", token }),
    me: (token: string) => request<{ data: AdminUser }>("/painel/auth/me", { token }),
  },

  pedidos: {
    list: (
      token: string,
      params: { status?: string; busca?: string; page?: number | string } = {},
    ) => {
      const qs = new URLSearchParams();
      if (params.status) qs.set("status", params.status);
      if (params.busca) qs.set("busca", params.busca);
      if (params.page) qs.set("page", String(params.page));
      const suffix = qs.toString() ? `?${qs}` : "";
      return request<{ data: PedidoLinha[]; meta: Meta; status_options: string[] }>(
        `/painel/pedidos${suffix}`,
        { token },
      );
    },
    show: (token: string, numero: string) =>
      request<{ data: PedidoDetalhe }>(`/painel/pedidos/${numero}`, { token }),
    separacao: (token: string, numero: string) =>
      request<{ data: { numero: string; status: string; codigo_rastreio: string | null } }>(
        `/painel/pedidos/${numero}/separacao`,
        { method: "POST", token },
      ),
    enviar: (token: string, numero: string, codigo_rastreio?: string) =>
      request<{ data: { numero: string; status: string; codigo_rastreio: string | null } }>(
        `/painel/pedidos/${numero}/enviar`,
        { method: "POST", token, body: { codigo_rastreio: codigo_rastreio ?? "" } },
      ),
    entregar: (token: string, numero: string) =>
      request<{ data: { numero: string; status: string; codigo_rastreio: string | null } }>(
        `/painel/pedidos/${numero}/entregar`,
        { method: "POST", token },
      ),
    cancelar: (token: string, numero: string, motivo?: string) =>
      request<{ data: { numero: string; status: string; codigo_rastreio: string | null } }>(
        `/painel/pedidos/${numero}/cancelar`,
        { method: "POST", token, body: { motivo: motivo ?? "" } },
      ),
  },

  produtos: {
    list: (token: string, params: { busca?: string; categoria?: string; page?: number | string } = {}) => {
      const qs = new URLSearchParams();
      if (params.busca) qs.set("busca", params.busca);
      if (params.categoria) qs.set("categoria", params.categoria);
      if (params.page) qs.set("page", String(params.page));
      const suffix = qs.toString() ? `?${qs}` : "";
      return request<{ data: ProdutoLinha[]; meta: Meta }>(`/painel/produtos${suffix}`, { token });
    },
    show: (token: string, id: number | string) =>
      request<{ data: ProdutoDetalheAdmin }>(`/painel/produtos/${id}`, { token }),
    create: (token: string, body: Json) =>
      request<{ data: ProdutoDetalheAdmin }>("/painel/produtos", { method: "POST", token, body }),
    update: (token: string, id: number | string, body: Json) =>
      request<{ data: ProdutoDetalheAdmin }>(`/painel/produtos/${id}`, { method: "PUT", token, body }),
    remove: (token: string, id: number | string) =>
      request<void>(`/painel/produtos/${id}`, { method: "DELETE", token }),
    fotoDelete: (token: string, id: number | string, mediaId: number | string) =>
      request<void>(`/painel/produtos/${id}/fotos/${mediaId}`, { method: "DELETE", token }),
  },

  variacoes: {
    create: (token: string, produtoId: number | string, body: Json) =>
      request<{ data: VariacaoAdmin }>(`/painel/produtos/${produtoId}/variacoes`, {
        method: "POST",
        token,
        body,
      }),
    update: (token: string, produtoId: number | string, varId: number | string, body: Json) =>
      request<{ data: VariacaoAdmin }>(`/painel/produtos/${produtoId}/variacoes/${varId}`, {
        method: "PUT",
        token,
        body,
      }),
    remove: (token: string, produtoId: number | string, varId: number | string) =>
      request<void>(`/painel/produtos/${produtoId}/variacoes/${varId}`, { method: "DELETE", token }),
  },

  categorias: {
    list: (token: string) => request<{ data: CategoriaAdmin[] }>("/painel/categorias", { token }),
    create: (token: string, body: Json) =>
      request<{ data: CategoriaAdmin }>("/painel/categorias", { method: "POST", token, body }),
    update: (token: string, id: number | string, body: Json) =>
      request<{ data: CategoriaAdmin }>(`/painel/categorias/${id}`, { method: "PUT", token, body }),
    remove: (token: string, id: number | string) =>
      request<void>(`/painel/categorias/${id}`, { method: "DELETE", token }),
  },

  configuracoes: {
    show: (token: string) => request<{ data: ConfiguracoesPainel }>("/painel/configuracoes", { token }),
    update: (token: string, body: Json) =>
      request<{ data: ConfiguracoesPainel }>("/painel/configuracoes", { method: "PUT", token, body }),
  },
};

/**
 * Upload de foto (multipart). Encaminha o File recebido no action do Remix
 * para o endpoint Laravel /produtos/{id}/fotos com o campo `foto` e o Bearer.
 */
export async function uploadFotoProduto(
  token: string,
  produtoId: number | string,
  file: File,
): Promise<{ data: { id: number; url: string; ordem: number } }> {
  const fd = new FormData();
  fd.append("foto", file, file.name || "foto.jpg");

  const res = await fetch(`${env.apiBaseUrl}/painel/produtos/${produtoId}/fotos`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      // NÃO definir Content-Type: o fetch monta o boundary do multipart sozinho.
    },
    body: fd,
  });

  return parse<{ data: { id: number; url: string; ordem: number } }>(
    res,
    `/painel/produtos/${produtoId}/fotos`,
  );
}
