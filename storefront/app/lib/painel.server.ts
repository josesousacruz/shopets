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
};

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
