import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, FileText, User, Hash } from 'lucide-react';
import { AccountPayable, Supplier } from '../../types';

interface EdicaoContaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dados: DadosEdicaoConta) => void;
  conta: AccountPayable | null;
  suppliers: Supplier[];
}

export interface DadosEdicaoConta {
  numero_documento?: string;
  descricao: string;
  id_fornecedor?: number;
  valor_original: number;
  data_vencimento: string;
  categoria: string;
  tipo_documento: string;
  observacoes?: string;
}

const EdicaoContaModal: React.FC<EdicaoContaModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  conta,
  suppliers
}) => {
  const [formData, setFormData] = useState<DadosEdicaoConta>({
    numero_documento: '',
    descricao: '',
    id_fornecedor: undefined,
    valor_original: 0,
    data_vencimento: '',
    categoria: 'fornecedor',
    tipo_documento: 'nota_fiscal',
    observacoes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (conta && isOpen) {
      setFormData({
        numero_documento: conta.numero_documento || '',
        descricao: conta.descricao,
        id_fornecedor: conta.id_fornecedor,
        valor_original: conta.valor_original,
        data_vencimento: conta.data_vencimento,
        categoria: conta.categoria || 'fornecedor',
        tipo_documento: conta.tipo_documento || 'nota_fiscal',
        observacoes: conta.observacoes || ''
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

  const handleInputChange = (field: keyof DadosEdicaoConta, value: string | number) => {
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

    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    }

    if (!formData.valor_original || formData.valor_original <= 0) {
      newErrors.valor_original = 'Valor deve ser maior que zero';
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
      onClose();
    }
  };

  if (!isOpen || !conta) return null;

  const categorias = [
    { value: 'fornecedor', label: 'Fornecedor' },
    { value: 'despesa_operacional', label: 'Despesa Operacional' },
    { value: 'imposto', label: 'Imposto' },
    { value: 'financiamento', label: 'Financiamento' },
    { value: 'outros', label: 'Outros' }
  ];

  const tiposDocumento = [
    { value: 'nota_fiscal', label: 'Nota Fiscal' },
    { value: 'boleto', label: 'Boleto' },
    { value: 'duplicata', label: 'Duplicata' },
    { value: 'recibo', label: 'Recibo' },
    { value: 'outros', label: 'Outros' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Editar Conta a Pagar
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
          {/* Número do Documento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Hash className="inline mr-1" size={16} />
              Número do Documento
            </label>
            <input
              type="text"
              value={formData.numero_documento}
              onChange={(e) => handleInputChange('numero_documento', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: NF-001234"
              maxLength={50}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="inline mr-1" size={16} />
              Descrição *
            </label>
            <input
              type="text"
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.descricao ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Descrição da conta"
              maxLength={200}
            />
            {errors.descricao && (
              <p className="text-red-500 text-xs mt-1">{errors.descricao}</p>
            )}
          </div>

          {/* Fornecedor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="inline mr-1" size={16} />
              Fornecedor
            </label>
            <select
              value={formData.id_fornecedor || ''}
              onChange={(e) => handleInputChange('id_fornecedor', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione um fornecedor</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id_fornecedor} value={supplier.id_fornecedor}>
                  {supplier.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="inline mr-1" size={16} />
                Valor Original *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.valor_original}
                onChange={(e) => handleInputChange('valor_original', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.valor_original ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0,00"
              />
              {errors.valor_original && (
                <p className="text-red-500 text-xs mt-1">{errors.valor_original}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline mr-1" size={16} />
                Data de Vencimento *
              </label>
              <input
                type="date"
                value={formData.data_vencimento}
                onChange={(e) => handleInputChange('data_vencimento', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.data_vencimento ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.data_vencimento && (
                <p className="text-red-500 text-xs mt-1">{errors.data_vencimento}</p>
              )}
            </div>
          </div>

          {/* Categoria e Tipo de Documento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <select
                value={formData.categoria}
                onChange={(e) => handleInputChange('categoria', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categorias.map((categoria) => (
                  <option key={categoria.value} value={categoria.value}>
                    {categoria.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Documento
              </label>
              <select
                value={formData.tipo_documento}
                onChange={(e) => handleInputChange('tipo_documento', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {tiposDocumento.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Observações adicionais..."
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
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EdicaoContaModal;