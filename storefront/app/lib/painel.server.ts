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
  etiqueta_url: string | null;
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
  produtos_count?: number;
}

export interface BannerAdmin {
  id: number;
  titulo: string;
  subtitulo: string | null;
  imagem_path: string | null;
  link: string | null;
  ordem: number;
  ativo: boolean;
  vigencia_de: string | null;
  vigencia_ate: string | null;
}

export interface CupomAdmin {
  id: number;
  codigo: string;
  tipo: "percentual" | "valor_fixo" | "frete_gratis";
  valor: number;
  valor_minimo_pedido: number;
  valido_de: string | null;
  valido_ate: string | null;
  uso_maximo: number | null;
  usos_atuais: number;
  ativo: boolean;
}

export interface DevolucaoLinha {
  id: number;
  pedido: string | null;
  cliente: string | null;
  status: string;
  motivo: string;
  valor_reembolso: number | null;
  criado_em: string | null;
}

export interface DevolucaoDetalhe extends DevolucaoLinha {
  observacao_admin: string | null;
  itens: { id_pedido_item: number; quantidade: number; nome: string | null }[];
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
    endereco_cep: string | null;
    endereco_logradouro: string | null;
    endereco_numero: string | null;
    endereco_complemento: string | null;
    endereco_bairro: string | null;
    endereco_cidade: string | null;
    endereco_uf: string | null;
    endereco_codigo_ibge: string | null;
    caixa_modo_sessao: boolean;
  };
  seo?: {
    seo_titulo: string | null;
    seo_descricao: string | null;
    og_image_path: string | null;
  };
  fiscal?: {
    ambiente_nfce: number;
    csc_nfce: string | null;
    csc_id_nfce: string | null;
    certificado_path: string | null;
    certificado_definido: boolean;
    certificado_validade: string | null;
    inscricao_estadual: string | null;
    regime_tributario: string;
    nfe_serie: string;
    nfe_proximo_numero: number;
  };
  integracoes: {
    payment_driver: string | null;
    yapay_sandbox: boolean;
    yapay_configurado: boolean;
    mercadopago_sandbox: boolean;
    mercadopago_configurado: boolean;
    mercadopago_webhook_configurado: boolean;
    shipping_driver: string | null;
    melhor_envio_sandbox: boolean;
    melhor_envio_sandbox_client_id: string | null;
    melhor_envio_sandbox_secret_configurado: boolean;
    melhor_envio_prod_client_id: string | null;
    melhor_envio_prod_secret_configurado: boolean;
    melhor_envio_callback_url: string;
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
    cancelar: (token: string, numero: string, motivo: string) =>
      request<{ data: { numero: string; status: string; estorno?: { solicitado: boolean; ok: boolean } } }>(
        `/painel/pedidos/${numero}/cancelar`,
        { method: "POST", token, body: { motivo } },
      ),
    atualizarRastreio: (token: string, numero: string, codigo_rastreio: string) =>
      request<{ data: { numero: string; codigo_rastreio: string } }>(
        `/painel/pedidos/${numero}/rastreio`,
        { method: "PUT", token, body: { codigo_rastreio } },
      ),
    mensagens: (token: string, numero: string) =>
      request<{ data: { id: number; autor_tipo: string; autor: string; texto: string; criado_em: string | null }[] }>(
        `/painel/pedidos/${numero}/mensagens`,
        { token },
      ),
    enviarMensagem: (token: string, numero: string, texto: string) =>
      request<{ data: { id: number; texto: string } }>(
        `/painel/pedidos/${numero}/mensagens`,
        { method: "POST", token, body: { texto } },
      ),
    // Tenta comprar etiqueta real no Melhor Envio (quando configurado) e cai
    // pro PDF interno automaticamente no backend — sempre volta uma URL.
    etiqueta: (token: string, numero: string) =>
      request<{ data: { numero: string; etiqueta_url: string } }>(
        `/painel/pedidos/${numero}/etiqueta`,
        { method: "POST", token },
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
    bulk: (token: string, body: { ids: number[]; action: "status" | "categoria" | "price_delta"; payload: Json }) =>
      request<{ data: { afetados: number } }>("/painel/produtos/bulk", { method: "POST", token, body }),
    create: (token: string, body: Json) =>
      request<{ data: ProdutoDetalheAdmin }>("/painel/produtos", { method: "POST", token, body }),
    update: (token: string, id: number | string, body: Json) =>
      request<{ data: ProdutoDetalheAdmin }>(`/painel/produtos/${id}`, { method: "PUT", token, body }),
    remove: (token: string, id: number | string) =>
      request<void>(`/painel/produtos/${id}`, { method: "DELETE", token }),
    fotoDelete: (token: string, id: number | string, mediaId: number | string) =>
      request<void>(`/painel/produtos/${id}/fotos/${mediaId}`, { method: "DELETE", token }),
    fotoOrdem: (token: string, id: number | string, ordem: number[]) =>
      request<{ data: { ordem: number[] } }>(`/painel/produtos/${id}/fotos/ordem`, { method: "PUT", token, body: { ordem } }),
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

  banners: {
    list: (token: string) => request<{ data: BannerAdmin[] }>("/painel/banners", { token }),
    create: (token: string, body: Json) =>
      request<{ data: BannerAdmin }>("/painel/banners", { method: "POST", token, body }),
    update: (token: string, id: number | string, body: Json) =>
      request<{ data: BannerAdmin }>(`/painel/banners/${id}`, { method: "PUT", token, body }),
    remove: (token: string, id: number | string) =>
      request<void>(`/painel/banners/${id}`, { method: "DELETE", token }),
  },

  cupons: {
    list: (token: string) => request<{ data: CupomAdmin[] }>("/painel/cupons", { token }),
    create: (token: string, body: Json) =>
      request<{ data: CupomAdmin }>("/painel/cupons", { method: "POST", token, body }),
    update: (token: string, id: number | string, body: Json) =>
      request<{ data: CupomAdmin }>(`/painel/cupons/${id}`, { method: "PUT", token, body }),
    remove: (token: string, id: number | string) =>
      request<void>(`/painel/cupons/${id}`, { method: "DELETE", token }),
  },

  configuracoes: {
    show: (token: string) => request<{ data: ConfiguracoesPainel }>("/painel/configuracoes", { token }),
    update: (token: string, body: Json) =>
      request<{ data: ConfiguracoesPainel }>("/painel/configuracoes", { method: "PUT", token, body }),
    uploadCertificado: async (
      token: string,
      arquivo: File,
      senha: string,
    ): Promise<{ data: { certificado_definido: boolean; certificado_validade: string | null; expirado: boolean } }> => {
      const fd = new FormData();
      fd.append("certificado", arquivo, arquivo.name || "certificado.pfx");
      fd.append("senha", senha);
      const res = await fetch(`${env.apiBaseUrl}/painel/configuracoes/certificado`, {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        body: fd,
      });
      return parse(res, "/painel/configuracoes/certificado");
    },
  },

  integracoes: {
    melhorEnvio: {
      status: (token: string) =>
        request<{ data: { conectado: boolean } }>("/painel/integracoes/melhor-envio", { token }),
      connect: (token: string) =>
        request<{ data: { url: string } }>("/painel/integracoes/melhor-envio/connect", {
          method: "POST",
          token,
        }),
      disconnect: (token: string) =>
        request<{ data: { conectado: boolean } }>("/painel/integracoes/melhor-envio", {
          method: "DELETE",
          token,
        }),
    },
  },

  devolucoes: {
    list: (token: string, params: { status?: string; page?: number | string } = {}) => {
      const qs = new URLSearchParams();
      if (params.status) qs.set("status", params.status);
      if (params.page) qs.set("page", String(params.page));
      const suffix = qs.toString() ? `?${qs}` : "";
      return request<{ data: DevolucaoLinha[]; meta: Meta; status_options: string[] }>(
        `/painel/devolucoes${suffix}`,
        { token },
      );
    },
    show: (token: string, id: number | string) =>
      request<{ data: DevolucaoDetalhe }>(`/painel/devolucoes/${id}`, { token }),
    aprovar: (token: string, id: number | string) =>
      request<{ data: DevolucaoDetalhe }>(`/painel/devolucoes/${id}/aprovar`, { method: "PUT", token }),
    rejeitar: (token: string, id: number | string, observacao_admin?: string) =>
      request<{ data: DevolucaoDetalhe }>(`/painel/devolucoes/${id}/rejeitar`, {
        method: "PUT",
        token,
        body: { observacao_admin: observacao_admin ?? "" },
      }),
    receber: (token: string, id: number | string) =>
      request<{ data: DevolucaoDetalhe }>(`/painel/devolucoes/${id}/receber`, { method: "PUT", token }),
    reembolsar: (token: string, id: number | string) =>
      request<{ data: DevolucaoDetalhe }>(`/painel/devolucoes/${id}/reembolsar`, { method: "PUT", token }),
  },

  pontosVenda: {
    list: (token: string) =>
      request<{ data: PontoVendaResumo[] }>("/painel/pontos-venda", { token }),
  },

  estoque: {
    list: (token: string, params: { q?: string; deposito_id?: number; abaixo_minimo?: boolean } = {}) => {
      const qs = new URLSearchParams();
      if (params.q) qs.set("q", params.q);
      if (params.deposito_id) qs.set("deposito_id", String(params.deposito_id));
      if (params.abaixo_minimo) qs.set("abaixo_minimo", "1");
      const suffix = qs.toString() ? `?${qs}` : "";
      return request<{ data: SaldoEstoqueRow[]; meta: Meta }>(`/painel/estoque${suffix}`, { token });
    },
    depositos: (token: string) =>
      request<{ data: DepositoItem[] }>("/painel/estoque/depositos", { token }),
    ajustar: (token: string, body: Json) =>
      request<{ data: SaldoEstoqueRow }>("/painel/estoque/ajuste", { method: "POST", token, body }),
    transferir: (token: string, body: Json) =>
      request<{ data: { ok: boolean } }>("/painel/estoque/transferencias", { method: "POST", token, body }),
    kardex: (token: string, variacaoId: number | string, params: { deposito_id?: number } = {}) => {
      const qs = new URLSearchParams();
      if (params.deposito_id) qs.set("deposito_id", String(params.deposito_id));
      const suffix = qs.toString() ? `?${qs}` : "";
      return request<{ data: KardexLinha[] }>(`/painel/estoque/kardex/${variacaoId}${suffix}`, { token });
    },
    inventarios: {
      list: (token: string, params: { deposito_id?: number; status?: string } = {}) => {
        const qs = new URLSearchParams();
        if (params.deposito_id) qs.set("deposito_id", String(params.deposito_id));
        if (params.status) qs.set("status", params.status);
        const suffix = qs.toString() ? `?${qs}` : "";
        return request<{ data: InventarioListItem[]; meta: Meta }>(
          `/painel/inventarios${suffix}`,
          { token },
        );
      },
      show: (token: string, id: number | string) =>
        request<{ data: InventarioDetalhe }>(`/painel/inventarios/${id}`, { token }),
      create: (token: string, body: Json) =>
        request<{ data: InventarioDetalhe }>("/painel/inventarios", { method: "POST", token, body }),
      contar: (token: string, id: number | string, body: Json) =>
        request<{ data: InventarioContagemRow }>(
          `/painel/inventarios/${id}/contagens`,
          { method: "POST", token, body },
        ),
      concluir: (token: string, id: number | string) =>
        request<{ data: InventarioDetalhe }>(
          `/painel/inventarios/${id}/concluir`,
          { method: "POST", token },
        ),
      cancelar: (token: string, id: number | string) =>
        request<{ data: InventarioDetalhe }>(
          `/painel/inventarios/${id}/cancelar`,
          { method: "POST", token },
        ),
    },
    curvaAbc: (token: string, params: { periodo_dias?: number } = {}) => {
      const qs = new URLSearchParams();
      if (params.periodo_dias) qs.set("periodo_dias", String(params.periodo_dias));
      const suffix = qs.toString() ? `?${qs}` : "";
      return request<{ data: CurvaAbcLinha[]; meta: CurvaAbcMeta }>(
        `/painel/relatorios/curva-abc${suffix}`,
        { token },
      );
    },
  },

  clientes: {
    list: (token: string, params: ClientesListParams = {}) => {
      const qs = new URLSearchParams();
      if (params.q) qs.set("q", params.q);
      if (params.status) qs.set("status", params.status);
      if (params.tag_id) qs.set("tag_id", String(params.tag_id));
      if (params.criado_de) qs.set("criado_de", params.criado_de);
      if (params.criado_ate) qs.set("criado_ate", params.criado_ate);
      if (params.page) qs.set("page", String(params.page));
      const suffix = qs.toString() ? `?${qs}` : "";
      return request<{ data: ClienteLinha[]; meta: Meta }>(
        `/painel/clientes${suffix}`,
        { token },
      );
    },
    show: (token: string, id: number | string) =>
      request<{
        data: { cliente: ClienteDetalhe; metricas: ClienteMetricas };
      }>(`/painel/clientes/${id}`, { token }),
    create: (token: string, body: Json) =>
      request<{ data: ClienteLinha }>("/painel/clientes", { method: "POST", token, body }),
    update: (token: string, id: number | string, body: Json) =>
      request<{ data: ClienteLinha }>(`/painel/clientes/${id}`, { method: "PUT", token, body }),
    toggle: (token: string, id: number | string) =>
      request<{ data: { ativo: boolean } }>(`/painel/clientes/${id}/toggle`, { method: "POST", token }),
    destroy: (token: string, id: number | string) =>
      request<void>(`/painel/clientes/${id}`, { method: "DELETE", token }),
    addNota: (token: string, id: number | string, texto: string) =>
      request<{ data: ClienteNotaItem }>(`/painel/clientes/${id}/notas`, { method: "POST", token, body: { texto } }),
    removeNota: (token: string, id: number | string, notaId: number | string) =>
      request<void>(`/painel/clientes/${id}/notas/${notaId}`, { method: "DELETE", token }),
    syncTags: (token: string, id: number | string, tag_ids: number[]) =>
      request<{ data: unknown }>(`/painel/clientes/${id}/tags`, { method: "POST", token, body: { tag_ids } }),
    tags: {
      list: (token: string) =>
        request<{ data: ClienteTagItem[] }>("/painel/cliente-tags", { token }),
      create: (token: string, body: Json) =>
        request<{ data: ClienteTagItem }>("/painel/cliente-tags", { method: "POST", token, body }),
      destroy: (token: string, id: number | string) =>
        request<void>(`/painel/cliente-tags/${id}`, { method: "DELETE", token }),
    },
    segmentos: {
      list: (token: string) =>
        request<{ data: SegmentoItem[] }>("/painel/segmentos-clientes", { token }),
      create: (token: string, body: Json) =>
        request<{ data: SegmentoItem }>("/painel/segmentos-clientes", { method: "POST", token, body }),
      destroy: (token: string, id: number | string) =>
        request<void>(`/painel/segmentos-clientes/${id}`, { method: "DELETE", token }),
    },
  },

  busca: (token: string, q: string) =>
    request<{
      data: {
        pedidos: { id: number; numero: string; total: number; status: string }[];
        produtos: { id: number; nome: string; preco_venda: number }[];
        clientes: { id: number; nome: string; email: string }[];
      };
    }>(`/painel/busca?q=${encodeURIComponent(q)}`, { token }),

  notificacoes: {
    summary: (token: string) =>
      request<{ data: { unread_count: number } }>("/painel/notificacoes/summary", { token }),
    list: (token: string, params: { unread?: boolean; tipo?: string; page?: number } = {}) => {
      const qs = new URLSearchParams();
      if (params.unread) qs.set("unread", "1");
      if (params.tipo) qs.set("tipo", params.tipo);
      if (params.page) qs.set("page", String(params.page));
      const suffix = qs.toString() ? `?${qs}` : "";
      return request<{
        data: NotificacaoItem[];
        meta: Meta & { unread_count: number };
      }>(`/painel/notificacoes${suffix}`, { token });
    },
    marcarLida: (token: string, id: number | string) =>
      request<{ data: NotificacaoItem }>(`/painel/notificacoes/${id}/marcar-lida`, {
        method: "POST",
        token,
      }),
    marcarTodasLidas: (token: string) =>
      request<{ data: { ok: boolean } }>("/painel/notificacoes/marcar-todas-lidas", {
        method: "POST",
        token,
      }),
  },

  fornecedores: {
    list: (token: string, params: { q?: string; status?: string; page?: number } = {}) => {
      const qs = new URLSearchParams();
      if (params.q) qs.set("q", params.q);
      if (params.status) qs.set("status", params.status);
      if (params.page) qs.set("page", String(params.page));
      const suffix = qs.toString() ? `?${qs}` : "";
      return request<{ data: FornecedorLinha[]; meta: Meta }>(`/painel/fornecedores${suffix}`, { token });
    },
    show: (token: string, id: number | string) =>
      request<{ data: FornecedorLinha }>(`/painel/fornecedores/${id}`, { token }),
    create: (token: string, body: Json) =>
      request<{ data: FornecedorLinha }>("/painel/fornecedores", { method: "POST", token, body }),
    update: (token: string, id: number | string, body: Json) =>
      request<{ data: FornecedorLinha }>(`/painel/fornecedores/${id}`, { method: "PUT", token, body }),
    destroy: (token: string, id: number | string) =>
      request<void>(`/painel/fornecedores/${id}`, { method: "DELETE", token }),
    produtos: (token: string, id: number | string) =>
      request<{ data: FornecedorProdutoVinc[] }>(`/painel/fornecedores/${id}/produtos`, { token }),
    vincularProduto: (token: string, id: number | string, body: Json) =>
      request<{ data: { ok: boolean } }>(`/painel/fornecedores/${id}/produtos`, { method: "POST", token, body }),
    desvincularProduto: (token: string, id: number | string, produto: number | string) =>
      request<void>(`/painel/fornecedores/${id}/produtos/${produto}`, { method: "DELETE", token }),
    historico: (token: string, id: number | string) =>
      request<{ data: FornecedorHistorico }>(`/painel/fornecedores/${id}/historico`, { token }),
  },

  compras: {
    list: (token: string, params: { status?: string; fornecedor_id?: number; q?: string; page?: number } = {}) => {
      const qs = new URLSearchParams();
      if (params.status) qs.set("status", params.status);
      if (params.fornecedor_id) qs.set("fornecedor_id", String(params.fornecedor_id));
      if (params.q) qs.set("q", params.q);
      if (params.page) qs.set("page", String(params.page));
      const suffix = qs.toString() ? `?${qs}` : "";
      return request<{ data: CompraLinha[]; meta: Meta }>(`/painel/compras${suffix}`, { token });
    },
    show: (token: string, id: number | string) =>
      request<{ data: CompraDetalhe }>(`/painel/compras/${id}`, { token }),
    create: (token: string, body: Json) =>
      request<{ data: CompraDetalhe }>("/painel/compras", { method: "POST", token, body }),
    update: (token: string, id: number | string, body: Json) =>
      request<{ data: CompraDetalhe }>(`/painel/compras/${id}`, { method: "PUT", token, body }),
    destroy: (token: string, id: number | string) =>
      request<void>(`/painel/compras/${id}`, { method: "DELETE", token }),
    enviar: (token: string, id: number | string) =>
      request<{ data: CompraDetalhe }>(`/painel/compras/${id}/enviar`, { method: "POST", token }),
    receber: (token: string, id: number | string, body: Json) =>
      request<{ data: unknown; pedido: CompraDetalhe }>(`/painel/compras/${id}/receber`, { method: "POST", token, body }),
    cancelar: (token: string, id: number | string) =>
      request<{ data: CompraDetalhe }>(`/painel/compras/${id}/cancelar`, { method: "POST", token }),
    sugestaoReposicao: (token: string, params: { fornecedor_id?: number } = {}) => {
      const qs = new URLSearchParams();
      if (params.fornecedor_id) qs.set("fornecedor_id", String(params.fornecedor_id));
      const suffix = qs.toString() ? `?${qs}` : "";
      return request<{ data: SugestaoGrupo[] }>(`/painel/compras/sugestao-reposicao${suffix}`, { token });
    },
  },

  financeiro: {
    planoContas: {
      tree: (token: string) => request<{ data: PlanoContaNode[] }>("/painel/financeiro/plano-contas", { token }),
      create: (token: string, body: Json) =>
        request<{ data: unknown }>("/painel/financeiro/plano-contas", { method: "POST", token, body }),
      update: (token: string, id: number | string, body: Json) =>
        request<{ data: unknown }>(`/painel/financeiro/plano-contas/${id}`, { method: "PUT", token, body }),
      mover: (token: string, id: number | string, parent_id: number | null) =>
        request<{ data: unknown }>(`/painel/financeiro/plano-contas/${id}/mover`, { method: "POST", token, body: { parent_id } }),
      destroy: (token: string, id: number | string) =>
        request<void>(`/painel/financeiro/plano-contas/${id}`, { method: "DELETE", token }),
    },
    contasBancarias: {
      list: (token: string) => request<{ data: ContaBancariaItem[] }>("/painel/financeiro/contas-bancarias", { token }),
      create: (token: string, body: Json) =>
        request<{ data: ContaBancariaItem }>("/painel/financeiro/contas-bancarias", { method: "POST", token, body }),
      update: (token: string, id: number | string, body: Json) =>
        request<{ data: ContaBancariaItem }>(`/painel/financeiro/contas-bancarias/${id}`, { method: "PUT", token, body }),
      destroy: (token: string, id: number | string) =>
        request<void>(`/painel/financeiro/contas-bancarias/${id}`, { method: "DELETE", token }),
    },
    contasPagar: {
      list: (token: string, params: { status?: string; vencimento_de?: string; vencimento_ate?: string; page?: number } = {}) => {
        const qs = new URLSearchParams();
        if (params.status) qs.set("status", params.status);
        if (params.vencimento_de) qs.set("vencimento_de", params.vencimento_de);
        if (params.vencimento_ate) qs.set("vencimento_ate", params.vencimento_ate);
        if (params.page) qs.set("page", String(params.page));
        const suffix = qs.toString() ? `?${qs}` : "";
        return request<{ data: ContaItem[]; meta: Meta; resumo: ContasResumo }>(`/painel/financeiro/contas-pagar${suffix}`, { token });
      },
      create: (token: string, body: Json) =>
        request<{ data: ContaItem[] }>("/painel/financeiro/contas-pagar", { method: "POST", token, body }),
      baixar: (token: string, id: number | string, body: Json) =>
        request<{ data: ContaItem }>(`/painel/financeiro/contas-pagar/${id}/baixar`, { method: "POST", token, body }),
      destroy: (token: string, id: number | string) =>
        request<void>(`/painel/financeiro/contas-pagar/${id}`, { method: "DELETE", token }),
    },
    contasReceber: {
      list: (token: string, params: { status?: string; vencimento_de?: string; vencimento_ate?: string; page?: number } = {}) => {
        const qs = new URLSearchParams();
        if (params.status) qs.set("status", params.status);
        if (params.vencimento_de) qs.set("vencimento_de", params.vencimento_de);
        if (params.vencimento_ate) qs.set("vencimento_ate", params.vencimento_ate);
        if (params.page) qs.set("page", String(params.page));
        const suffix = qs.toString() ? `?${qs}` : "";
        return request<{ data: ContaItem[]; meta: Meta; resumo: ContasResumo }>(`/painel/financeiro/contas-receber${suffix}`, { token });
      },
      create: (token: string, body: Json) =>
        request<{ data: ContaItem[] }>("/painel/financeiro/contas-receber", { method: "POST", token, body }),
      baixar: (token: string, id: number | string, body: Json) =>
        request<{ data: ContaItem }>(`/painel/financeiro/contas-receber/${id}/baixar`, { method: "POST", token, body }),
      destroy: (token: string, id: number | string) =>
        request<void>(`/painel/financeiro/contas-receber/${id}`, { method: "DELETE", token }),
    },
    fluxoCaixa: (token: string, params: { modo?: string; de?: string; ate?: string; conta_bancaria_id?: number } = {}) => {
      const qs = new URLSearchParams();
      if (params.modo) qs.set("modo", params.modo);
      if (params.de) qs.set("de", params.de);
      if (params.ate) qs.set("ate", params.ate);
      if (params.conta_bancaria_id) qs.set("conta_bancaria_id", String(params.conta_bancaria_id));
      const suffix = qs.toString() ? `?${qs}` : "";
      return request<{ data: FluxoCaixaResultado; modo: string }>(`/painel/financeiro/fluxo-caixa${suffix}`, { token });
    },
    dre: (token: string, params: { de?: string; ate?: string } = {}) => {
      const qs = new URLSearchParams();
      if (params.de) qs.set("de", params.de);
      if (params.ate) qs.set("ate", params.ate);
      const suffix = qs.toString() ? `?${qs}` : "";
      return request<{ data: DREResultado }>(`/painel/financeiro/dre${suffix}`, { token });
    },
    conciliacao: {
      linhas: (token: string, contaBancariaId: number | string) =>
        request<{ data: ExtratoLinha[] }>(`/painel/financeiro/conciliacao/linhas?conta_bancaria_id=${contaBancariaId}`, { token }),
      sugestoes: (token: string, linha: number | string) =>
        request<{ data: ConciliacaoSugestao[] }>(`/painel/financeiro/conciliacao/${linha}/sugestoes`, { token }),
      aplicar: (token: string, linha: number | string, body: Json) =>
        request<{ data: unknown }>(`/painel/financeiro/conciliacao/${linha}/match`, { method: "POST", token, body }),
    },
  },

  pdv: {
    list: (token: string) => request<{ data: PdvItem[] }>("/painel/pontos-venda", { token }),
    show: (token: string, id: number | string) => request<{ data: PdvDetalhe }>(`/painel/pontos-venda/${id}`, { token }),
    create: (token: string, body: Json) =>
      request<{ data: PdvItem }>("/painel/pontos-venda", { method: "POST", token, body }),
    update: (token: string, id: number | string, body: Json) =>
      request<{ data: PdvItem }>(`/painel/pontos-venda/${id}`, { method: "PUT", token, body }),
    destroy: (token: string, id: number | string) =>
      request<void>(`/painel/pontos-venda/${id}`, { method: "DELETE", token }),
    syncOperadores: (token: string, id: number | string, user_ids: number[]) =>
      request<{ data: { id: number; name: string; email: string }[] }>(
        `/painel/pontos-venda/${id}/operadores`, { method: "POST", token, body: { user_ids } }),
    usuariosDisponiveis: (token: string) =>
      request<{ data: { id: number; name: string; email: string }[] }>("/painel/usuarios", { token }),
  },

  dashboard: {
    serieVendas: (token: string, periodo = "30d") =>
      request<{ data: { data: string; pedidos: number; total: number }[]; comparacao: { total_atual: number; total_anterior: number; variacao_pct: number | null } }>(
        `/painel/dashboard/serie-vendas?periodo=${periodo}`, { token }),
    topProdutos: (token: string, periodo = "30d") =>
      request<{ data: { produto: string; quantidade: number; total: number }[] }>(`/painel/dashboard/top-produtos?periodo=${periodo}`, { token }),
    topCategorias: (token: string, periodo = "30d") =>
      request<{ data: { categoria: string; quantidade: number; total: number }[] }>(`/painel/dashboard/top-categorias?periodo=${periodo}`, { token }),
    kpis: (token: string, periodo = "30d") =>
      request<{ data: { faturamento: number; pedidos: number; ticket_medio: number; estoque_abaixo_minimo: number; a_receber_pendente: number; a_pagar_pendente: number } }>(
        `/painel/dashboard/kpis?periodo=${periodo}`, { token }),
  },

  revisaoFiscal: {
    list: (token: string, page = 1) =>
      request<{
        data: { numero: string; modalidade: string; cliente: string; total: number; motivo: string | null; atualizado_em: string | null }[];
        meta: { current_page: number; last_page: number; total: number };
      }>(`/painel/revisao-fiscal?page=${page}`, { token }),
    reemitir: (token: string, numero: string) =>
      request<{ data: { numero: string; status: string; nfe_chave: string | null; resolvido: boolean } }>(
        `/painel/revisao-fiscal/${numero}/reemitir`,
        { method: "POST", token },
      ),
  },

  relatorios: {
    list: (token: string) =>
      request<{ data: RelatorioDef[]; grupos: Record<string, string>; favoritos: RelatorioFavorito[] }>(
        "/painel/relatorios", { token }),
    show: (token: string, slug: string, params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request<RelatorioDados>(`/painel/relatorios/${slug}${qs ? `?${qs}` : ""}`, { token });
    },
    favoritar: (token: string, body: Json) =>
      request<{ data: RelatorioFavorito }>("/painel/relatorios/favoritos", { method: "POST", token, body }),
    removerFavorito: (token: string, id: number | string) =>
      request<void>(`/painel/relatorios/favoritos/${id}`, { method: "DELETE", token }),
    agendar: (token: string, body: Json) =>
      request<{ data: unknown }>("/painel/relatorios/agendamentos", { method: "POST", token, body }),
  },

  papeis: {
    list: (token: string) => request<{ data: PapelItem[] }>("/painel/papeis", { token }),
    permissoes: (token: string) => request<{ data: Record<string, string[]> }>("/painel/permissoes", { token }),
    show: (token: string, id: number | string) =>
      request<{ data: PapelDetalhe }>(`/painel/papeis/${id}`, { token }),
    create: (token: string, body: { nome: string; permissions: string[] }) =>
      request<{ data: unknown }>("/painel/papeis", { method: "POST", token, body }),
    update: (token: string, id: number | string, body: { nome: string; permissions: string[] }) =>
      request<{ data: unknown }>(`/painel/papeis/${id}`, { method: "PUT", token, body }),
    destroy: (token: string, id: number | string) =>
      request<void>(`/painel/papeis/${id}`, { method: "DELETE", token }),
  },

  templatesEmail: {
    list: (token: string) => request<{ data: TemplateEmailItem[] }>("/painel/templates-email", { token }),
    create: (token: string, body: Json) =>
      request<{ data: TemplateEmailItem }>("/painel/templates-email", { method: "POST", token, body }),
    update: (token: string, id: number | string, body: Json) =>
      request<{ data: TemplateEmailItem }>(`/painel/templates-email/${id}`, { method: "PUT", token, body }),
    destroy: (token: string, id: number | string) =>
      request<void>(`/painel/templates-email/${id}`, { method: "DELETE", token }),
    preview: (token: string, id: number | string) =>
      request<{ data: { assunto: string; corpo_html: string } }>(`/painel/templates-email/${id}/preview`, { token }),
  },
};

export interface PapelItem {
  id: number;
  nome: string;
  descricao: string | null;
  permissions_count: number;
  sistema?: boolean;
}

export interface PapelDetalhe {
  id: number;
  nome: string;
  descricao: string | null;
  sistema?: boolean;
  permissions: string[];
}

export interface TemplateEmailItem {
  id: number;
  slug: string;
  nome: string;
  assunto: string;
  corpo_html: string;
  variaveis: string[] | null;
  ativo: boolean;
}

export interface SaldoEstoqueRow {
  id: number;
  saldo: number;
  reservado: number;
  minimo: number;
  custo_medio: number;
  variacao: {
    id_variacao: number;
    sku: string | null;
    nome_variacao?: string | null;
    produto?: { nome: string };
  } | null;
  deposito: { id: number; nome: string } | null;
}

export interface DepositoItem {
  id: number;
  nome: string;
  default: boolean;
  ativo: boolean;
}

export interface InventarioListItem {
  id: number;
  deposito_id: number;
  status: string;
  aberto_em: string | null;
  finalizado_em: string | null;
  observacoes: string | null;
  deposito?: { id: number; nome: string } | null;
  aberto_por?: { id: number; name: string } | null;
}

export interface InventarioContagemRow {
  id: number;
  inventario_id: number;
  produto_variacao_id: number;
  saldo_sistema: number;
  saldo_contado: number | null;
  diferenca: number | null;
  observacoes: string | null;
  variacao?: {
    id_variacao: number;
    sku: string | null;
    produto?: { nome: string };
  } | null;
}

export interface InventarioDetalhe extends InventarioListItem {
  contagens: InventarioContagemRow[];
}

export interface CurvaAbcLinha {
  id_produto: number;
  produto: string;
  qtd_total: number;
  receita_total: number;
  perc: number;
  perc_acumulado: number;
  classe: "A" | "B" | "C";
}

export interface CurvaAbcMeta {
  periodo_dias: number;
  desde: string;
  receita_total: number;
  contagem_total: number;
  classes: { A: number; B: number; C: number };
}

export interface KardexLinha {
  id_movimentacao: number;
  deposito_id: number | null;
  id_produto_variacao: number | null;
  tipo_movimentacao: string;
  origem_type: string | null;
  quantidade: number;
  observacoes: string | null;
  data_movimentacao: string | null;
  created_at: string;
}

export interface ClientesListParams {
  q?: string;
  status?: string;
  tag_id?: number;
  criado_de?: string;
  criado_ate?: string;
  page?: number;
}

export interface ClienteLinha {
  id_cliente: number;
  nome: string;
  email: string;
  cpf_cnpj: string | null;
  telefone: string | null;
  ativo: boolean;
  pedidos_count?: number;
  created_at: string;
}

export interface ClienteMetricas {
  total_gasto: number;
  qtd_pedidos: number;
  ticket_medio: number;
  ultima_compra: string | null;
}

export interface ClienteDetalhe extends ClienteLinha {
  tipo_pessoa: string | null;
  data_nascimento: string | null;
  aceita_marketing: boolean;
  tags: ClienteTagItem[];
  notas: ClienteNotaItem[];
  enderecos: unknown[];
}

export interface ClienteTagItem {
  id: number;
  nome: string;
  cor: string;
}

export interface ClienteNotaItem {
  id: number;
  texto: string;
  user?: { id: number; name: string } | null;
  created_at: string;
}

export interface SegmentoItem {
  id: number;
  nome: string;
  filtros: Record<string, unknown>;
}

export interface NotificacaoItem {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string | null;
  link: string | null;
  lida_em: string | null;
  created_at: string;
}

export interface PontoVendaResumo {
  id: number;
  nome: string;
  ativo?: boolean;
  permite_retirada?: boolean;
}

/**
 * Upload de imagem de banner (multipart). Cria ou atualiza o banner com o
 * arquivo `imagem` e os demais campos. PUT via _method override (Laravel).
 */
export async function salvarBannerComUpload(
  token: string,
  id: number | string | null,
  campos: Record<string, string>,
  file: File,
): Promise<{ data: BannerAdmin }> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.append(k, v);
  fd.append("imagem", file, file.name || "banner.jpg");

  const path = id ? `/painel/banners/${id}` : "/painel/banners";
  if (id) fd.append("_method", "PUT"); // Laravel method spoofing para multipart

  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: fd,
  });

  return parse<{ data: BannerAdmin }>(res, path);
}

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

/** Baixa um relatório exportado (csv/pdf) como bytes + headers para repasse ao browser. */
export async function exportRelatorio(
  token: string,
  slug: string,
  formato: string,
  params: Record<string, string> = {},
): Promise<{ body: ArrayBuffer; contentType: string; filename: string }> {
  const qs = new URLSearchParams({ ...params, formato }).toString();
  const res = await fetch(`${env.apiBaseUrl}/painel/relatorios/${slug}/export?${qs}`, {
    headers: { Accept: "*/*", Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new PainelValidationError(res.status, `Falha ao exportar (${res.status}).`, {});
  }
  const disp = res.headers.get("Content-Disposition") ?? "";
  const match = disp.match(/filename="?([^"]+)"?/);
  return {
    body: await res.arrayBuffer(),
    contentType: res.headers.get("Content-Type") ?? "application/octet-stream",
    filename: match?.[1] ?? `${slug}.${formato}`,
  };
}

/** Upload de arquivo OFX (multipart) para conciliação bancária. */
export async function uploadOfx(
  token: string,
  contaBancariaId: number | string,
  file: File,
): Promise<{ data: { importadas: number; ignoradas: number } }> {
  const fd = new FormData();
  fd.append("conta_bancaria_id", String(contaBancariaId));
  fd.append("arquivo", file, file.name || "extrato.ofx");

  const res = await fetch(`${env.apiBaseUrl}/painel/financeiro/conciliacao`, {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    body: fd,
  });

  return parse<{ data: { importadas: number; ignoradas: number } }>(res, "/painel/financeiro/conciliacao");
}

// ---- Fornecedores & Compras (Fase 4) -------------------------------------

export interface FornecedorLinha {
  id_fornecedor: number;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  contato_principal: string | null;
  observacoes: string | null;
  prazo_medio_dias: number | null;
  condicao_pagamento_padrao: string | null;
  desconto_padrao: string | number | null;
  ativo: boolean;
  produtos_count?: number;
}

export interface FornecedorProdutoVinc {
  id_produto: number;
  nome: string;
  codigo_fornecedor: string | null;
  codigo_no_fornecedor: string | null;
  preco_custo_fornecedor: string | number | null;
  fornecedor_principal: boolean;
}

export interface FornecedorHistorico {
  pedidos: CompraLinha[];
  metricas: {
    total_pedidos: number;
    total_comprado: number;
    ultimo_pedido: string | null;
  };
}

export type CompraStatus =
  | "rascunho"
  | "enviado"
  | "parcialmente_recebido"
  | "recebido"
  | "cancelado";

export interface CompraLinha {
  id: number;
  numero: string;
  status: CompraStatus;
  fornecedor_id: number;
  deposito_id: number;
  previsao_entrega: string | null;
  subtotal: string;
  frete: string;
  desconto: string;
  total: string;
  condicao_pagamento: string | null;
  itens_count?: number;
  created_at: string;
  fornecedor?: { id_fornecedor: number; nome: string } | null;
  deposito?: { id: number; nome: string } | null;
}

export interface CompraItem {
  id: number;
  pedido_compra_id: number;
  produto_variacao_id: number;
  qtd: number;
  qtd_recebida: number;
  custo_unit: string;
  total: string;
  variacao?: {
    id_variacao: number;
    sku: string | null;
    produto?: { nome: string };
  } | null;
}

export interface CompraDetalhe extends CompraLinha {
  observacoes: string | null;
  itens: CompraItem[];
  recebimentos?: {
    id: number;
    data: string;
    nota_fiscal: string | null;
    itens: { id: number; item_id: number; qtd_recebida: number }[];
  }[];
}

export interface SugestaoGrupoItem {
  produto_variacao_id: number;
  sku: string | null;
  produto: string;
  deposito_id: number;
  saldo: number;
  minimo: number;
  qtd_sugerida: number;
  custo_unit: number;
}

export interface SugestaoGrupo {
  fornecedor_id: number | null;
  fornecedor: string;
  itens: SugestaoGrupoItem[];
}

// ---- Financeiro (Fase 5) -------------------------------------------------

export interface PlanoContaNode {
  id: number;
  codigo: string;
  nome: string;
  tipo: "receita" | "despesa";
  ativo: boolean;
  parent_id: number | null;
  filhos: PlanoContaNode[];
}

export interface ContaBancariaItem {
  id: number;
  tipo: "banco" | "caixa" | "cartao" | "digital";
  nome: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  saldo_inicial: string;
  ativo: boolean;
}

export interface ContaItem {
  id_conta_pagar?: number;
  id_conta_receber?: number;
  numero_documento: string | null;
  descricao: string;
  valor_original: string;
  valor_pago?: string;
  valor_recebido?: string;
  data_vencimento: string;
  data_pagamento?: string | null;
  data_recebimento?: string | null;
  status: "pendente" | "pago" | "recebido" | "vencido" | "cancelado";
  categoria: string;
  numero_parcela: number;
  total_parcelas: number;
  fornecedor?: { id_fornecedor: number; nome: string } | null;
  cliente?: { id_cliente: number; nome: string } | null;
}

export interface ContasResumo {
  pendente: number;
  vencido: number;
  pago_mes?: number;
  recebido_mes?: number;
}

export interface FluxoCaixaResultado {
  linhas: { data: string; entradas: number; saidas: number; saldo: number }[];
  totais: { entradas: number; saidas: number; saldo: number };
}

export interface DREResultado {
  periodo: { de: string; ate: string };
  receitas: { plano: string; total: number }[];
  despesas: { plano: string; total: number }[];
  total_receitas: number;
  total_despesas: number;
  lucro_liquido: number;
}

export interface ExtratoLinha {
  id: number;
  data: string;
  valor: number;
  memo: string | null;
  conciliada: boolean;
}

export interface ConciliacaoSugestao {
  tipo: "pagar" | "receber";
  id: number;
  descricao: string;
  valor: number;
  data_vencimento: string;
  score: number;
}

// ---- PDV (Fase 6) --------------------------------------------------------

export interface PdvItem {
  id_pdv: number;
  nome_pdv: string;
  descricao: string | null;
  endereco: string | null;
  responsavel: string | null;
  telefone: string | null;
  ativo: boolean;
  permite_retirada: boolean;
  deposito_id: number | null;
  serie_fiscal_default: string | null;
  regime_tributario: string | null;
  nfce_proximo_numero?: number;
  users_count?: number;
  deposito?: { id: number; nome: string } | null;
}

export interface PdvDetalhe extends PdvItem {
  users: { id: number; name: string; email: string }[];
}

// ---- Relatórios (Fase 8) -------------------------------------------------

export interface RelatorioDef {
  slug: string;
  nome: string;
  grupo: string;
  grupo_label: string;
  filtros: string[];
}

export interface RelatorioFavorito {
  id: number;
  slug: string;
  nome: string;
  filtros: Record<string, string> | null;
}

export interface RelatorioDados {
  definicao: { slug: string; nome: string; grupo: string; filtros: string[]; colunas: Record<string, string> };
  linhas: Record<string, string | number>[];
  total: number;
}
