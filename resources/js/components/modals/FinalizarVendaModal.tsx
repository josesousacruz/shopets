import React, { useState, useEffect } from 'react';
import { X, User, CreditCard, Gift, FileText, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Cliente {
  id_cliente: number;
  nome: string;
  email?: string;
  telefone?: string;
  pontos_fidelidade?: number;
}

interface FormaPagamento {
  id_forma_pagamento: number;
  nome: string;
  tipo: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'transferencia' | 'cheque';
  permite_parcelamento: boolean;
  max_parcelas?: number;
  taxa_juros?: number;
}

interface DadosFinalizacao {
  id_cliente?: number;
  id_forma_pagamento: number;
  pontos_fidelidade_utilizados?: number;
  observacoes?: string;
}

interface FinalizarVendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dados: DadosFinalizacao) => void;
  onCancel: () => void;
  clientes: Cliente[];
  formasPagamento: FormaPagamento[];
  valorTotal: number;
  numeroVenda?: string;
}

const FinalizarVendaModal: React.FC<FinalizarVendaModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  clientes,
  formasPagamento,
  valorTotal,
  numeroVenda
}) => {
  const [formData, setFormData] = useState<DadosFinalizacao>({
    id_forma_pagamento: formasPagamento?.[0]?.id_forma_pagamento || 1,
    pontos_fidelidade_utilizados: 0,
    observacoes: ''
  });

  const [searchCliente, setSearchCliente] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        id_forma_pagamento: formasPagamento?.[0]?.id_forma_pagamento || 1,
        pontos_fidelidade_utilizados: 0,
        observacoes: ''
      });
      setSearchCliente('');
      setClienteSelecionado(null);
      setShowClienteDropdown(false);
      setErrors({});
    }
  }, [isOpen]);

  const clientesFiltrados = (clientes || []).filter(cliente => {
    const searchTerm = (searchCliente || '').toLowerCase();
    return (
      cliente.nome.toLowerCase().includes(searchTerm) ||
      cliente.email?.toLowerCase().includes(searchTerm) ||
      cliente.telefone?.includes(searchCliente || '')
    );
  });

  const formaPagamentoSelecionada = (formasPagamento || []).find(
    fp => fp.id_forma_pagamento === formData.id_forma_pagamento
  );

  const handleClienteSelect = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setSearchCliente(cliente.nome);
    setShowClienteDropdown(false);
    setFormData(prev => ({ ...prev, id_cliente: cliente.id_cliente }));
    
    // Clear error if exists
    if (errors.cliente) {
      setErrors(prev => ({ ...prev, cliente: '' }));
    }
  };

  const handleInputChange = (field: keyof DadosFinalizacao, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (data: DadosFinalizacao = formData): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.id_forma_pagamento || data.id_forma_pagamento <= 0) {
      newErrors.id_forma_pagamento = 'Selecione uma forma de pagamento';
    }

    if (data.pontos_fidelidade_utilizados && clienteSelecionado) {
      const pontosDisponiveis = clienteSelecionado.pontos_fidelidade || 0;
      if ((data.pontos_fidelidade_utilizados || 0) > pontosDisponiveis) {
        newErrors.pontos_fidelidade_utilizados = `Cliente possui apenas ${pontosDisponiveis} pontos`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (validateForm()) {
      onConfirm(formData);
    }
  };

  const finalizeWithPayment = (idForma: number) => {
    const dados: DadosFinalizacao = {
      ...formData,
      id_forma_pagamento: idForma
    };
    setFormData(dados);
    if (validateForm(dados)) {
      onConfirm(dados);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Finalizar Venda</h2>
              {numeroVenda && (
                <p className="text-sm text-gray-500">Venda #{numeroVenda}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Valor Total */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-green-700 font-medium">Total da Venda:</span>
                <span className="text-2xl font-bold text-green-800">
                  {formatCurrency(valorTotal)}
                </span>
              </div>
            </div>

            {/* Cliente */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <User className="inline mr-2" size={16} />
                Cliente (Opcional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar cliente por nome, email ou telefone..."
                  value={searchCliente}
                  onChange={(e) => {
                    setSearchCliente(e.target.value);
                    setShowClienteDropdown(true);
                    if (!e.target.value) {
                      setClienteSelecionado(null);
                      setFormData(prev => ({ ...prev, id_cliente: undefined }));
                    }
                  }}
                  onFocus={() => setShowClienteDropdown(true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                {showClienteDropdown && searchCliente && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {clientesFiltrados.length > 0 ? (
                      clientesFiltrados.map((cliente) => (
                        <button
                          key={cliente.id_cliente}
                          onClick={() => handleClienteSelect(cliente)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium">{cliente.nome}</div>
                          {cliente.email && (
                            <div className="text-sm text-gray-500">{cliente.email}</div>
                          )}
                          {cliente.pontos_fidelidade && cliente.pontos_fidelidade > 0 && (
                            <div className="text-sm text-green-600">
                              {cliente.pontos_fidelidade} pontos disponíveis
                            </div>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500">Nenhum cliente encontrado</div>
                    )}
                  </div>
                )}
              </div>
              {errors.cliente && (
                <p className="text-red-500 text-sm flex items-center">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.cliente}
                </p>
              )}
            </div>

            {/* Pontos de Fidelidade */}
            {clienteSelecionado && clienteSelecionado.pontos_fidelidade && clienteSelecionado.pontos_fidelidade > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <Gift className="inline mr-2" size={16} />
                  Pontos de Fidelidade
                </label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700 mb-2">
                    Cliente possui {clienteSelecionado.pontos_fidelidade} pontos disponíveis
                  </p>
                  <input
                    type="number"
                    min="0"
                    max={clienteSelecionado.pontos_fidelidade}
                    placeholder="Pontos a utilizar"
                    value={formData.pontos_fidelidade_utilizados || ''}
                    onChange={(e) => handleInputChange('pontos_fidelidade_utilizados', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {errors.pontos_fidelidade_utilizados && (
                  <p className="text-red-500 text-sm flex items-center">
                    <AlertCircle size={16} className="mr-1" />
                    {errors.pontos_fidelidade_utilizados}
                  </p>
                )}
              </div>
            )}

            {/* Forma de Pagamento em Botões */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <CreditCard className="inline mr-2" size={16} />
                Escolha a forma de pagamento
              </label>
              <div className="flex flex-col gap-3">
                {formasPagamento.map((forma) => {
                  const baseBtn =
                    'w-full px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors';
                  const byTipo: Record<string, string> = {
                    dinheiro: 'bg-green-600 text-white hover:bg-green-700',
                    cartao_credito: 'bg-blue-600 text-white hover:bg-blue-700',
                    cartao_debito: 'bg-blue-600 text-white hover:bg-blue-700',
                    pix: 'bg-purple-600 text-white hover:bg-purple-700',
                    transferencia: 'bg-orange-600 text-white hover:bg-orange-700',
                    cheque: 'bg-gray-600 text-white hover:bg-gray-700'
                  };
                  const style = byTipo[forma.tipo] || 'bg-gray-600 text-white hover:bg-gray-700';
                  return (
                    <button
                      key={forma.id_forma_pagamento}
                      onClick={() => finalizeWithPayment(forma.id_forma_pagamento)}
                      className={`${baseBtn} ${style}`}
                    >
                      <CreditCard size={18} />
                      {forma.nome}
                    </button>
                  );
                })}
              </div>
              {errors.id_forma_pagamento && (
                <p className="text-red-500 text-sm flex items-center">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.id_forma_pagamento}
                </p>
              )}
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <FileText className="inline mr-2" size={16} />
                Observações
              </label>
              <textarea
                placeholder="Observações sobre a venda..."
                value={formData.observacoes || ''}
                onChange={(e) => handleInputChange('observacoes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors font-medium"
            >
              Cancelar Venda
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FinalizarVendaModal;