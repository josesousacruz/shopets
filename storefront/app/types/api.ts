export interface Categoria {
  id: number;
  nome: string;
  slug: string;
  imagem: string | null;
  ordem: number;
  pai_id: number | null;
  descricao: string | null;
}

export interface ProdutoLista {
  id: number;
  slug: string;
  nome: string;
  descricao_curta: string | null;
  preco_venda: number;
  preco_promocional: number | null;
  em_promocao: boolean;
  novo: boolean;
  destaque: boolean;
  categoria?: { nome: string; slug: string };
  imagem_capa: string | null;
  tem_variacoes: boolean | null;
  disponivel: boolean;
}

export interface Variacao {
  id: number;
  sku: string;
  nome: string;
  atributos: Record<string, string>;
  preco_venda: number;
  preco_promocional: number | null;
  preco_efetivo: number;
  disponivel: boolean;
}

export interface ProdutoDetalhe extends Omit<ProdutoLista, "tem_variacoes"> {
  descricao_longa: string | null;
  peso_gramas: number | null;
  dimensoes_cm: { altura: number | null; largura: number | null; comprimento: number | null };
  seo: { title: string; description: string | null; og_image: string | null };
  galeria: { url: string; url_medium: string; url_large: string }[];
  variacoes: Variacao[];
}

export interface Paginated<T> {
  data: T[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: { current_page: number; from: number | null; last_page: number; per_page: number; to: number | null; total: number; path: string };
}

export interface Cliente {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  origem: string | null;
  aceita_marketing: boolean;
  created_at: string | null;
}

export interface Endereco {
  id: number;
  apelido: string | null;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  tipo: "entrega" | "cobranca" | "ambos";
  principal: boolean;
}

export interface CepResultado {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface AuthResposta {
  cliente: Cliente;
  token: string;
}
