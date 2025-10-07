export type UnitType = 'un' | 'kg' | 'g' | 'l' | 'ml' | 'cx' | 'm' | 'cm';

export interface Product {
  id: string | number;
  name: string;
  price: number; // Preço por unidade de medida (mantido para compatibilidade)
  purchasePrice?: number; // Preço de compra
  salePrice?: number; // Preço de venda
  stock: number;
  category: string;
  categoryId?: string | number;
  barcode?: string;
  internalCode?: string;
  image?: string;
  description?: string;
  unit: UnitType; // Unidade de medida
  allowFractional?: boolean; // Se permite venda fracionada
  allowFraction?: boolean; // Alias para allowFractional
  minQuantity?: number; // Quantidade mínima (ex: 0.1kg)
  stepQuantity?: number; // Incremento (ex: 0.1kg, 0.05kg)
  minStock?: number; // Estoque mínimo para alerta
  supplierId?: string; // ID do fornecedor
  stockHistory?: StockEntry[]; // Histórico de entradas de estoque
}

export interface CartItem {
  product: Product;
  quantity: number; // Pode ser fracionário agora (ex: 2.5kg)
}

export interface Cart {
  id: string;
  name: string;
  items: CartItem[];
  total: number;
  itemCount: number;
}

export interface Sale {
  id: string;
  items: CartItem[];
  total: number;
  date: Date;
  paymentMethod: 'dinheiro' | 'cartao' | 'pix';
}

export interface Category {
  id: string | number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface Supplier {
  id_fornecedor: number;
  nome: string;
  cpf_cnpj?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  pessoa_contato?: string;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Campos para compatibilidade
  productIds?: string[];
  purchaseHistory?: PurchaseHistory[];
}

export interface StockEntry {
  id: string;
  productId: string;
  quantity: number;
  purchasePrice: number;
  supplierId: string;
  date: Date;
  notes?: string;
  invoiceNumber?: string;
  invoiceFile?: File | string;
}

export interface PurchaseHistory {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  date: Date;
  invoiceNumber?: string;
  notes?: string;
  invoiceFile?: File | string;
}

export type LoyaltyLevel = 'bronze' | 'prata' | 'ouro' | 'diamante';

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  type: 'earn' | 'redeem';
  points: number;
  description: string;
  date: Date;
  saleId?: string;
}

export interface LoyaltyProgram {
  id: string;
  name: string;
  pointsPerReal: number; // Pontos ganhos por real gasto
  levels: {
    level: LoyaltyLevel;
    minPoints: number;
    discount: number; // Desconto em porcentagem
    benefits: string[];
  }[];
  isActive: boolean;
}

export interface Customer {
  id_cliente: number;
  nome: string;
  cpf_cnpj?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  data_nascimento?: string;
  tipo_pessoa: 'fisica' | 'juridica';
  pontos_fidelidade: number;
  limite_credito: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Campos calculados/accessors
  loyaltyLevel?: LoyaltyLevel;
  totalSpent?: number;
  lastPurchase?: string;
}

export type FinancialEntryStatus = 'pendente' | 'recebido' | 'vencido' | 'cancelado';
export type FinancialCategory = 'compra' | 'despesa' | 'servico' | 'venda' | 'outros';
export type DocumentType = 'nota_fiscal' | 'boleto' | 'duplicata' | 'promissoria' | 'recibo' | 'outros';

export interface AccountPayable {
  id_conta_pagar: number;
  numero_documento?: string;
  descricao: string;
  id_fornecedor: number;
  id_pdv: number;
  id_usuario: number;
  valor_original: number;
  valor_pago: number;
  valor_desconto: number;
  valor_juros: number;
  valor_multa: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: FinancialEntryStatus;
  categoria: FinancialCategory;
  tipo_documento: DocumentType;
  observacoes?: string;
  numero_parcela: number;
  total_parcelas: number;
  id_conta_origem?: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  fornecedor?: Supplier;
  ponto_venda?: any;
  usuario?: User;
  conta_origem?: AccountPayable;
  parcelas?: AccountPayable[];
  // Accessors
  valor_saldo?: number;
  status_formatado?: string;
  dias_vencimento?: number;
}

export interface AccountReceivable {
  id_conta_receber: number;
  numero_documento?: string;
  descricao: string;
  id_cliente: number;
  id_venda?: number;
  id_pdv: number;
  id_usuario: number;
  valor_original: number;
  valor_recebido: number;
  valor_desconto: number;
  valor_juros: number;
  valor_multa: number;
  data_vencimento: string;
  data_recebimento?: string;
  status: FinancialEntryStatus;
  categoria: FinancialCategory;
  tipo_documento: DocumentType;
  observacoes?: string;
  numero_parcela: number;
  total_parcelas: number;
  id_conta_origem?: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  cliente?: Customer;
  venda?: Sale;
  ponto_venda?: any;
  usuario?: User;
  conta_origem?: AccountReceivable;
  parcelas?: AccountReceivable[];
  // Accessors
  valor_saldo?: number;
  status_formatado?: string;
  dias_vencimento?: number;
}

export interface Operator {
  id: string;
  name: string;
  username: string;
  password: string;
  role: 'admin' | 'cashier' | 'manager';
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export interface OperatorSession {
  operator: Operator;
  loginTime: Date;
  isLoggedIn: boolean;
}

// Tipos do Inertia.js
export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string;
}

export interface PageProps {
  auth: {
    user: User;
  };
  [key: string]: any;
}
