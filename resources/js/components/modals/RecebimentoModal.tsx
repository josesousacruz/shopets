import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { AccountReceivable } from '../../types';

interface RecebimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: RecebimentoData) => void;
  conta: AccountReceivable | null;
}

export interface RecebimentoData {
  valor_recebido: number;
  data_recebimento: string;
  valor_desconto: number;
  valor_juros: number;
  observacoes: string;
}

const RecebimentoModal: React.FC<RecebimentoModalProps> = ({ isOpen, onClose, onConfirm, conta }) => {
  const [formData, setFormData] = useState<RecebimentoData>({
    valor_recebido: 0,
    data_recebimento: new Date().toISOString().split('T')[0],
    valor_desconto: 0,
    valor_juros: 0,
    observacoes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (conta && isOpen) {
      setFormData({
        valor_recebido: conta.valor_original,
        data_recebimento: new Date().toISOString().split('T')[0],
        valor_desconto: 0,
        valor_juros: 0,
        observacoes: ''
      });
      setErrors({});
    }
  }, [conta, isOpen]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const parseCurrency = (value: string): number => {
    return parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  };

  const handleInputChange = (field: keyof RecebimentoData, value: string | number) => {
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

    if (!formData.valor_recebido || formData.valor_recebido <= 0) {
      newErrors.valor_recebido = 'Valor recebido é obrigatório e deve ser maior que zero';
    }

    if (!formData.data_recebimento) {
      newErrors.data_recebimento = 'Data de recebimento é obrigatória';
    }

    if (formData.valor_desconto < 0) {
      newErrors.valor_desconto = 'Desconto não pode ser negativo';
    }

    if (formData.valor_juros < 0) {
      newErrors.valor_juros = 'Juros não pode ser negativo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onConfirm(formData);
    }
  };

  const valorTotal = formData.valor_recebido + formData.valor_juros - formData.valor_desconto;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Confirmar Recebimento</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {conta && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">Conta: {conta.descricao}</p>
            <p className="text-sm text-gray-600">Valor Original: {formatCurrency(conta.valor_original)}</p>
            <p className="text-sm text-gray-600">Vencimento: {new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor Recebido *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.valor_recebido}
              onChange={(e) => handleInputChange('valor_recebido', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.valor_recebido ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0,00"
            />
            {errors.valor_recebido && (
              <p className="text-red-500 text-xs mt-1">{errors.valor_recebido}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data de Recebimento *
            </label>
            <input
              type="date"
              value={formData.data_recebimento}
              onChange={(e) => handleInputChange('data_recebimento', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.data_recebimento ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.data_recebimento && (
              <p className="text-red-500 text-xs mt-1">{errors.data_recebimento}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desconto
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.valor_desconto}
              onChange={(e) => handleInputChange('valor_desconto', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
              value={formData.valor_juros}
              onChange={(e) => handleInputChange('valor_juros', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Observações sobre o recebimento..."
            />
          </div>

          <div className="bg-blue-50 p-3 rounded">
            <p className="text-sm font-medium text-blue-800">
              Valor Total a Receber: {formatCurrency(valorTotal)}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Confirmar Recebimento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecebimentoModal;