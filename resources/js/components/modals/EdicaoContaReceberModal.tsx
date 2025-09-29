import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { AccountReceivable, Customer } from '../../types';

interface EdicaoContaReceberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: EdicaoContaReceberData) => void;
  conta: AccountReceivable | null;
  clientes: Customer[];
}

export interface EdicaoContaReceberData {
  numero_documento: string;
  descricao: string;
  id_cliente: number;
  valor_original: number;
  data_vencimento: string;
  observacoes: string;
}

const EdicaoContaReceberModal: React.FC<EdicaoContaReceberModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  conta, 
  clientes 
}) => {
  const [formData, setFormData] = useState<EdicaoContaReceberData>({
    numero_documento: '',
    descricao: '',
    id_cliente: 0,
    valor_original: 0,
    data_vencimento: '',
    observacoes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (conta && isOpen) {
      setFormData({
        numero_documento: conta.numero_documento || '',
        descricao: conta.descricao || '',
        id_cliente: conta.id_cliente || 0,
        valor_original: conta.valor_original || 0,
        data_vencimento: conta.data_vencimento ? conta.data_vencimento.split('T')[0] : '',
        observacoes: conta.observacoes || ''
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

  const handleInputChange = (field: keyof EdicaoContaReceberData, value: string | number) => {
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

    if (!formData.numero_documento.trim()) {
      newErrors.numero_documento = 'Número do documento é obrigatório';
    }

    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    }

    if (!formData.id_cliente || formData.id_cliente === 0) {
      newErrors.id_cliente = 'Cliente é obrigatório';
    }

    if (!formData.valor_original || formData.valor_original <= 0) {
      newErrors.valor_original = 'Valor original é obrigatório e deve ser maior que zero';
    }

    if (!formData.data_vencimento) {
      newErrors.data_vencimento = 'Data de vencimento é obrigatória';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Editar Conta a Receber</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número do Documento *
            </label>
            <input
              type="text"
              value={formData.numero_documento}
              onChange={(e) => handleInputChange('numero_documento', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.numero_documento ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: NF-001"
            />
            {errors.numero_documento && (
              <p className="text-red-500 text-xs mt-1">{errors.numero_documento}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição *
            </label>
            <input
              type="text"
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.descricao ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Descrição da conta"
            />
            {errors.descricao && (
              <p className="text-red-500 text-xs mt-1">{errors.descricao}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente *
            </label>
            <select
              value={formData.id_cliente}
              onChange={(e) => handleInputChange('id_cliente', parseInt(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.id_cliente ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value={0}>Selecione um cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id_cliente} value={cliente.id_cliente}>
                  {cliente.nome}
                </option>
              ))}
            </select>
            {errors.id_cliente && (
              <p className="text-red-500 text-xs mt-1">{errors.id_cliente}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor Original *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.valor_original}
              onChange={(e) => handleInputChange('valor_original', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.valor_original ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0,00"
            />
            {errors.valor_original && (
              <p className="text-red-500 text-xs mt-1">{errors.valor_original}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Valor formatado: {formatCurrency(formData.valor_original)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data de Vencimento *
            </label>
            <input
              type="date"
              value={formData.data_vencimento}
              onChange={(e) => handleInputChange('data_vencimento', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.data_vencimento ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.data_vencimento && (
              <p className="text-red-500 text-xs mt-1">{errors.data_vencimento}</p>
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
              placeholder="Observações adicionais..."
            />
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EdicaoContaReceberModal;