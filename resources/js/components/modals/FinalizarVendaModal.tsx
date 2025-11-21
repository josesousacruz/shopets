import React, { useState, useEffect, useRef } from 'react';
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

interface PagamentoParcial {
  id_forma_pagamento: number;
  valor_pagamento: number;
  numero_parcelas?: number;
}

interface DadosFinalizacao {
  id_cliente?: number;
  id_forma_pagamento: number;
  pontos_fidelidade_utilizados?: number;
  observacoes?: string;
  acao_pos?: 'finalizar' | 'cupom' | 'nfe';
  desconto_valor?: number;
  pagamentos?: PagamentoParcial[];
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
  descontoValor?: number;
}

const FinalizarVendaModal: React.FC<FinalizarVendaModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  clientes,
  formasPagamento,
  valorTotal,
  numeroVenda,
  descontoValor
}) => {
  const [formData, setFormData] = useState<DadosFinalizacao>({
    id_forma_pagamento: formasPagamento?.[0]?.id_forma_pagamento || 1,
    pontos_fidelidade_utilizados: 0,
    observacoes: '',
    desconto_valor: descontoValor
  });

  const [searchCliente, setSearchCliente] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showActions, setShowActions] = useState(false);
  const [pagamentos, setPagamentos] = useState<PagamentoParcial[]>([]);
  const [valorParcial, setValorParcial] = useState<number>(0);
  const [multiEnabled, setMultiEnabled] = useState<boolean>(false);
  const step2Ref = useRef<HTMLDivElement>(null);
  const [parcelasProxima, setParcelasProxima] = useState<number>(1);
  const [parcelasSimples, setParcelasSimples] = useState<number>(1);
  const [parcelModalOpen, setParcelModalOpen] = useState<boolean>(false);
  const [parcelModalMax, setParcelModalMax] = useState<number>(1);
  const [parcelModalValue, setParcelModalValue] = useState<number>(1);
  const [parcelModalCtx, setParcelModalCtx] = useState<'simples' | 'adicionar' | 'editar'>('simples');
  const [parcelModalFormaId, setParcelModalFormaId] = useState<number | null>(null);
  const [parcelModalIndex, setParcelModalIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        id_forma_pagamento: formasPagamento?.[0]?.id_forma_pagamento || 1,
        pontos_fidelidade_utilizados: 0,
        observacoes: '',
        desconto_valor: descontoValor
      });
      setSearchCliente('');
      setClienteSelecionado(null);
      setShowClienteDropdown(false);
      setErrors({});
      setShowActions(false);
      setPagamentos([]);
      setMultiEnabled(false);
      setValorParcial(0);
      setParcelasProxima(1);
      setParcelasSimples(1);
    }
  }, [isOpen, descontoValor]);

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

    const totalEsperado = Math.max(0, (valorTotal || 0) - (data.desconto_valor || 0));
    const lista = (data.pagamentos && data.pagamentos.length > 0) ? data.pagamentos : pagamentos;
    const somaPagamentos = lista.reduce((s, p) => s + (p.valor_pagamento || 0), 0);
    if (somaPagamentos <= 0) {
      newErrors.id_forma_pagamento = 'Adicione pelo menos um pagamento';
    } else if (Math.abs(somaPagamentos - totalEsperado) > 0.01) {
      newErrors.id_forma_pagamento = 'Os pagamentos não fecham o total';
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
    const totalEsperado = Math.max(0, (valorTotal || 0) - (formData.desconto_valor || 0));
    const formaSel = (formasPagamento || []).find(f => f.id_forma_pagamento === formData.id_forma_pagamento);
    const parcelas = formaSel?.permite_parcelamento ? Math.max(1, Math.min(parcelasSimples, formaSel?.max_parcelas || 1)) : 1;
    const pagamentosEnviar = multiEnabled
      ? pagamentos
      : [{ id_forma_pagamento: formData.id_forma_pagamento, valor_pagamento: totalEsperado, numero_parcelas: parcelas }];
    const dados: DadosFinalizacao = { ...formData, pagamentos: pagamentosEnviar };
    if (validateForm(dados)) {
      onConfirm(dados);
    }
  };

  const addPagamento = (idForma: number, numeroParcelas: number) => {
    const totalEsperado = Math.max(0, (valorTotal || 0) - (formData.desconto_valor || 0));
    const somaAtual = pagamentos.reduce((s, p) => s + p.valor_pagamento, 0);
    const restante = Math.max(0, totalEsperado - somaAtual);
    const valor = Math.min(restante, Math.max(0, valorParcial));
    if (valor <= 0) return;
    const novo: PagamentoParcial = { id_forma_pagamento: idForma, valor_pagamento: valor, numero_parcelas: Math.max(1, numeroParcelas) };
    const novos = [...pagamentos, novo];
    setPagamentos(novos);
    const somaNovo = novos.reduce((s, p) => s + p.valor_pagamento, 0);
    setShowActions(Math.abs(somaNovo - totalEsperado) <= 0.01);
  };

  const finalizeWithPayment = (idForma: number) => {
    const forma = (formasPagamento || []).find(f => f.id_forma_pagamento === idForma);
    if (forma?.permite_parcelamento) {
      setParcelModalCtx('adicionar');
      setParcelModalFormaId(idForma);
      setParcelModalIndex(null);
      setParcelModalMax(Math.max(1, forma.max_parcelas || 1));
      setParcelModalValue(Math.max(1, Math.min(parcelasProxima, Math.max(1, forma.max_parcelas || 1))));
      setParcelModalOpen(true);
    } else {
      addPagamento(idForma, 1);
    }
  };

  const handleAction = (acao: 'finalizar' | 'cupom' | 'nfe') => {
    const totalEsperado = Math.max(0, (valorTotal || 0) - (formData.desconto_valor || 0));
    const formaSel = (formasPagamento || []).find(f => f.id_forma_pagamento === formData.id_forma_pagamento);
    const parcelas = formaSel?.permite_parcelamento ? Math.max(1, Math.min(parcelasSimples, formaSel?.max_parcelas || 1)) : 1;
    const pagamentosEnviar = multiEnabled
      ? pagamentos
      : [{ id_forma_pagamento: formData.id_forma_pagamento, valor_pagamento: totalEsperado, numero_parcelas: parcelas }];
    const dados: DadosFinalizacao = { ...formData, acao_pos: acao, pagamentos: pagamentosEnviar };
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

  const valorSemDesconto = valorTotal || 0;
  const descontoAplicado = formData.desconto_valor || 0;
  const valorComDesconto = Math.max(0, valorSemDesconto - descontoAplicado);
  const somaPagamentos = pagamentos.reduce((s, p) => s + p.valor_pagamento, 0);
  const valorRestante = Math.max(0, valorComDesconto - somaPagamentos);
  useEffect(() => { setValorParcial(valorRestante); }, [valorRestante]);
  useEffect(() => {
    const totalEsperado = Math.max(0, (valorTotal || 0) - (formData.desconto_valor || 0));
    if (!multiEnabled) {
      setShowActions(true);
    } else {
      setShowActions(Math.abs(somaPagamentos - totalEsperado) <= 0.01);
    }
  }, [multiEnabled, somaPagamentos, valorTotal, formData.desconto_valor]);

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

            {/* Resumo Financeiro */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between text-sm text-gray-700">
                <span>Sem desconto</span>
                <span>{formatCurrency(valorSemDesconto)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-700 mt-1">
                <span>Desconto</span>
                <span>- {formatCurrency(descontoAplicado)}</span>
              </div>
              <div className="flex justify-between font-semibold mt-2">
                <span>Total</span>
                <span className="text-green-600">{formatCurrency(valorComDesconto)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={multiEnabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setMultiEnabled(checked);
                    setPagamentos([]);
                    setValorParcial(0);
                  }}
                  className="rounded border-gray-300"
                />
                Habilitar múltiplos pagamentos
              </label>
            </div>

            {!multiEnabled && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Selecione a forma de pagamento</label>
                <div className="flex flex-col gap-3">
                  {formasPagamento.map((forma) => {
                    const baseBtn =
                      'w-full px-4 py-3 rounded-lg font-medium flex items-center justify-between gap-2 transition-colors';
                    const byTipo: Record<string, string> = {
                      dinheiro: 'bg-green-600 text-white hover:bg-green-700',
                      cartao_credito: 'bg-blue-600 text-white hover:bg-blue-700',
                      cartao_debito: 'bg-blue-600 text-white hover:bg-blue-700',
                      pix: 'bg-purple-600 text-white hover:bg-purple-700',
                      transferencia: 'bg-orange-600 text-white hover:bg-orange-700',
                      cheque: 'bg-gray-600 text-white hover:bg-gray-700'
                    };
                    const style = byTipo[forma.tipo] || 'bg-gray-600 text-white hover:bg-gray-700';
                    const selected = forma.id_forma_pagamento === formData.id_forma_pagamento;
                    return (
                      <button
                        key={forma.id_forma_pagamento}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, id_forma_pagamento: forma.id_forma_pagamento }));
                          setShowActions(true);
                          if (forma.permite_parcelamento) {
                            setParcelModalCtx('simples');
                            setParcelModalFormaId(forma.id_forma_pagamento);
                            setParcelModalIndex(null);
                            setParcelModalMax(Math.max(1, forma.max_parcelas || 1));
                            setParcelModalValue(parcelasSimples);
                            setParcelModalOpen(true);
                          }
                          setTimeout(() => {
                            step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 0);
                        }}
                        className={`${baseBtn} ${style} ${selected ? 'ring-2 ring-white' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard size={18} />
                          {forma.nome}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const formaSel = (formasPagamento || []).find(f => f.id_forma_pagamento === formData.id_forma_pagamento);
                  if (!formaSel) return null;
                  return (
                    <div className="flex items-center gap-3 mt-3">
                      {formaSel.permite_parcelamento ? (
                        <button
                          type="button"
                          className="px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200"
                          onClick={() => {
                            setParcelModalCtx('simples');
                            setParcelModalFormaId(formaSel.id_forma_pagamento);
                            setParcelModalIndex(null);
                            setParcelModalMax(Math.max(1, formaSel.max_parcelas || 1));
                            setParcelModalValue(parcelasSimples);
                            setParcelModalOpen(true);
                          }}
                        >Alterar parcelas</button>
                      ) : (
                        <span className="text-xs text-gray-500">Forma não permite parcelamento</span>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}


            {/* Passo 1: selecionar formas e montar pagamentos */}
            {multiEnabled && !showActions && (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    <CreditCard className="inline mr-2" size={16} />
                    Passo 1: Selecione formas de pagamento
                  </label>
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={valorParcial}
                      onChange={(e) => setValorParcial(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Valor a adicionar"
                    />
                    {/* Parcelas são escolhidas via modal ao clicar na forma */}
                    <button
                      type="button"
                      className="px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200"
                      onClick={() => setValorParcial(valorRestante)}
                    >Usar restante</button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {formasPagamento.map((forma) => {
                      const baseBtn =
                        'w-full px-4 py-3 rounded-lg font-medium flex items-center justify-between gap-2 transition-colors';
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
                          <div className="flex items-center gap-2">
                            <CreditCard size={18} />
                            {forma.nome}
                          </div>
                          <div className="text-xs bg-white bg-opacity-10 rounded px-2 py-1">
                            {formatCurrency(pagamentos.filter(p => p.id_forma_pagamento === forma.id_forma_pagamento).reduce((s, p) => s + p.valor_pagamento, 0))}
                          </div>
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
                  <div className="mt-3">
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Adicionado</span>
                      <span className="font-semibold">{formatCurrency(somaPagamentos)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Restante</span>
                      <span className="font-semibold text-orange-600">{formatCurrency(valorRestante)}</span>
                    </div>
                  </div>
                  {pagamentos.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Pagamentos adicionados</label>
                      <div className="space-y-2">
                        {pagamentos.map((p, idx) => {
                          const forma = formasPagamento.find(f => f.id_forma_pagamento === p.id_forma_pagamento);
                          return (
                            <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                              <div className="text-sm">
                                <div className="font-medium">{forma?.nome || 'Forma'}</div>
                                <div className="text-gray-600">{formatCurrency(p.valor_pagamento)}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  className="text-blue-600 border border-blue-300 rounded px-2 py-1 text-xs hover:bg-blue-50"
                                  onClick={() => {
                                    const formaEdit = formasPagamento.find(f => f.id_forma_pagamento === p.id_forma_pagamento);
                                    const max = Math.max(1, formaEdit?.max_parcelas || 1);
                                    setParcelModalCtx('editar');
                                    setParcelModalFormaId(p.id_forma_pagamento);
                                    setParcelModalIndex(idx);
                                    setParcelModalMax(max);
                                    setParcelModalValue(Math.max(1, Math.min(p.numero_parcelas || 1, max)));
                                    setParcelModalOpen(true);
                                  }}
                                >Alterar parcelas</button>
                                <button
                                  className="text-red-600 border border-red-300 rounded px-2 py-1 text-xs hover:bg-red-50"
                                  onClick={() => {
                                    const novos = pagamentos.filter((_, i) => i !== idx);
                                    setPagamentos(novos);
                                    const somaNovo = novos.reduce((s, p2) => s + p2.valor_pagamento, 0);
                                    setShowActions(Math.abs(somaNovo - valorComDesconto) <= 0.01);
                                  }}
                                >Remover</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Passo 2: somente ações pós-pagamento */}
            {showActions && (
              <>
                <div ref={step2Ref} className="space-y-2">
                  {!multiEnabled && (
                    <div className="text-sm text-gray-700">
                      Método selecionado: <span className="font-semibold">{(formasPagamento.find(f => f.id_forma_pagamento === formData.id_forma_pagamento)?.nome) || '—'}</span>
                      {(formasPagamento.find(f => f.id_forma_pagamento === formData.id_forma_pagamento)?.permite_parcelamento) && (
                        <span className="ml-2 text-xs text-gray-500">{parcelasSimples}x</span>
                      )}
                    </div>
                  )}
                  <label className="block text-sm font-medium text-gray-700">
                    Passo 2: Escolha o que fazer após o pagamento
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      className="w-full px-4 py-3 rounded-lg font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
                      onClick={() => handleAction('finalizar')}
                    >
                      Finalizar
                    </button>
                    <button
                      type="button"
                      className="w-full px-4 py-3 rounded-lg font-medium bg-green-100 hover:bg-green-200 text-green-800 transition-colors"
                      onClick={() => handleAction('cupom')}
                    >
                      Imprimir Cupom Não Fiscal
                    </button>
                    <button
                      type="button"
                      className="w-full px-4 py-3 rounded-lg font-medium bg-blue-100 hover:bg-blue-200 text-blue-800 transition-colors"
                      onClick={() => handleAction('nfe')}
                    >
                      Emitir NFe
                    </button>
                  </div>
                </div>
              </>
            )}

                        {/* Cliente (Select) e Observações — fora dos steps */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <User className="inline mr-2" size={16} />
                  Cliente (Opcional)
                </label>
                <select
                  value={formData.id_cliente ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      setClienteSelecionado(null);
                      setFormData(prev => ({ ...prev, id_cliente: undefined }));
                    } else {
                      const id = parseInt(val, 10);
                      const c = (clientes || []).find(cli => cli.id_cliente === id) || null;
                      setClienteSelecionado(c);
                      setFormData(prev => ({ ...prev, id_cliente: id }));
                    }
                    if (errors.cliente) {
                      setErrors(prev => ({ ...prev, cliente: '' }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sem cliente</option>
                  {(clientes || []).map((cliente) => (
                    <option key={cliente.id_cliente} value={cliente.id_cliente}>
                      {cliente.nome}{cliente.email ? ` - ${cliente.email}` : ''}
                    </option>
                  ))}
                </select>
                {errors.cliente && (
                  <p className="text-red-500 text-sm flex items-center">
                    <AlertCircle size={16} className="mr-1" />
                    {errors.cliente}
                  </p>
                )}
              </div>

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
          </div>

          {/* Modal de Parcelas */}
          {parcelModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold">Selecionar Parcelas</h3>
                  <p className="text-sm text-gray-500">Escolha entre 1x e {parcelModalMax}x</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: parcelModalMax }, (_, i) => i + 1).map(n => (
                      <button
                        key={n}
                        onClick={() => setParcelModalValue(n)}
                        className={`px-3 py-2 rounded-lg border ${parcelModalValue === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-800 border-gray-300'} hover:bg-blue-50`}
                      >
                        {n}x
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                      onClick={() => setParcelModalOpen(false)}
                    >Cancelar</button>
                    <button
                      className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => {
                        if (parcelModalCtx === 'simples') {
                          setParcelasSimples(parcelModalValue);
                          setParcelModalOpen(false);
                        } else if (parcelModalCtx === 'adicionar' && parcelModalFormaId) {
                          setParcelasProxima(parcelModalValue);
                          setParcelModalOpen(false);
                          addPagamento(parcelModalFormaId, parcelModalValue);
                        } else if (parcelModalCtx === 'editar' && parcelModalIndex !== null) {
                          const novos = pagamentos.map((pg, i) => (
                            i === parcelModalIndex ? { ...pg, numero_parcelas: parcelModalValue } : pg
                          ));
                          setPagamentos(novos);
                          setParcelModalOpen(false);
                        }
                      }}
                    >Confirmar</button>
                  </div>
                </div>
              </div>
            </div>
          )}

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