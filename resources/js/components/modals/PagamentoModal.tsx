import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, FileText } from 'lucide-react';
import { AccountPayable } from '../../types';

interface PagamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dados: DadosPagamento) => void;
  conta: AccountPayable | null;
}

export interface DadosPagamento {
  valor_pago: number;
  data_pagamento: string;
  valor_desconto?: number;
  valor_juros?: number;
  valor_multa?: number;
  observacoes?: string;
}

const PagamentoModal: React.FC<PagamentoModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  conta
}) => {
  const [formData, setFormData] = useState<DadosPagamento>({
    valor_pago: 0,
    data_pagamento: new Date().toISOString().split('T')[0],
    valor_desconto: 0,
    valor_juros: 0,
    valor_multa: 0,
    observacoes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (conta && isOpen) {
      setFormData({
        valor_pago: conta.valor_original,
        data_pagamento: new Date().toISOString().split('T')[0],
        valor_desconto: 0,
        valor_juros: 0,
        valor_multa: 0,
        observacoes: ''
      });
      setErrors({});
    }
  }, [conta, isOpen]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleInputChange = (field: keyof DadosPagamento, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.valor_pago || formData.valor_pago <= 0) {
      newErrors.valor_pago = 'Valor pago é obrigatório e deve ser maior que zero';
    }

    if (!formData.data_pagamento) {
      newErrors.data_pagamento = 'Data de pagamento é obrigatória';
    }

    if (formData.valor_desconto && formData.valor_desconto < 0) {
      newErrors.valor_desconto = 'Valor de desconto não pode ser negativo';
    }

    if (formData.valor_juros && formData.valor_juros < 0) {
      newErrors.valor_juros = 'Valor de juros não pode ser negativo';
    }

    if (formData.valor_multa && formData.valor_multa < 0) {
      newErrors.valor_multa = 'Valor de multa não pode ser negativo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onConfirm(formData);
      onClose();
    }
  };

  const calcularValorTotal = () => {
    const valor = formData.valor_pago || 0;
    const desconto = formData.valor_desconto || 0;
    const juros = formData.valor_juros || 0;
    const multa = formData.valor_multa || 0;
    
    return valor - desconto + juros + multa;
  };

  if (!isOpen || !conta) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Registrar Pagamento
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Informações da Conta */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Conta a Pagar</h4>
            <p className="text-sm text-gray-600">{conta.descricao}</p>
            <p className="text-sm text-gray-600">
              Valor Original: <span className="font-medium">{formatCurrency(conta.valor_original)}</span>
            </p>
            <p className="text-sm text-gray-600">
              Vencimento: {new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Valor Pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <DollarSign className="inline mr-1" size={16} />
              Valor Pago *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.valor_pago}
              onChange={(e) => handleInputChange('valor_pago', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.valor_pago ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0,00"
            />
            {errors.valor_pago && (
              <p className="text-red-500 text-xs mt-1">{errors.valor_pago}</p>
            )}
          </div>

          {/* Data de Pagamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="inline mr-1" size={16} />
              Data de Pagamento *
            </label>
            <input
              type="date"
              value={formData.data_pagamento}
              onChange={(e) => handleInputChange('data_pagamento', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.data_pagamento ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.data_pagamento && (
              <p className="text-red-500 text-xs mt-1">{errors.data_pagamento}</p>
            )}
          </div>

          {/* Valores Adicionais */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desconto
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_desconto}
                onChange={(e) => handleInputChange('valor_desconto', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.valor_desconto ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0,00"
              />
              {errors.valor_desconto && (
                <p className="text-red-500 text-xs mt-1">{errors.valor_desconto}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Juros
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_juros}
                onChange={(e) => handleInputChange('valor_juros', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.valor_juros ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0,00"
              />
              {errors.valor_juros && (
                <p className="text-red-500 text-xs mt-1">{errors.valor_juros}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Multa
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_multa}
                onChange={(e) => handleInputChange('valor_multa', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.valor_multa ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0,00"
              />
              {errors.valor_multa && (
                <p className="text-red-500 text-xs mt-1">{errors.valor_multa}</p>
              )}
            </div>
          </div>

          {/* Valor Total */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900">Valor Total:</span>
              <span className="font-bold text-blue-600 text-lg">
                {formatCurrency(calcularValorTotal())}
              </span>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="inline mr-1" size={16} />
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Observações sobre o pagamento..."
              maxLength={500}
            />
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Confirmar Pagamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PagamentoModal;