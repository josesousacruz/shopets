import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { ArrowLeft, Save, FileText, DollarSign, Calendar, User, Tag, File } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Customer, PontoVenda, Venda } from '@/types';

interface CreateContaReceberProps {
    clientes: Customer[];
    pontosVenda: PontoVenda[];
    vendas: Venda[];
}

interface FormData {
    numero_documento: string;
    descricao: string;
    id_cliente: number;
    id_venda: number | null;
    id_pdv: number;
    valor_original: number;
    data_vencimento: string;
    categoria: string;
    tipo_documento: string;
    observacoes: string;
    total_parcelas: number;
}

export default function Create({ clientes, pontosVenda, vendas }: CreateContaReceberProps) {
    const [formData, setFormData] = useState<FormData>({
        numero_documento: '',
        descricao: '',
        id_cliente: 0,
        id_venda: null,
        id_pdv: 0,
        valor_original: 0,
        data_vencimento: '',
        categoria: '',
        tipo_documento: '',
        observacoes: '',
        total_parcelas: 1
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const handleInputChange = (field: keyof FormData, value: string | number | null) => {
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

        if (!formData.id_cliente || formData.id_cliente === 0) {
            newErrors.id_cliente = 'Cliente é obrigatório';
        }

        if (!formData.id_pdv || formData.id_pdv === 0) {
            newErrors.id_pdv = 'Ponto de venda é obrigatório';
        }

        if (!formData.valor_original || formData.valor_original <= 0) {
            newErrors.valor_original = 'Valor deve ser maior que zero';
        }

        if (!formData.data_vencimento) {
            newErrors.data_vencimento = 'Data de vencimento é obrigatória';
        }

        if (!formData.categoria) {
            newErrors.categoria = 'Categoria é obrigatória';
        }

        if (!formData.tipo_documento) {
            newErrors.tipo_documento = 'Tipo de documento é obrigatório';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        setLoading(true);

        router.post('/contas-receber', formData, {
            onSuccess: () => {
                router.visit('/contas-receber');
            },
            onError: (errors) => {
                setErrors(errors);
                setLoading(false);
            },
            onFinish: () => {
                setLoading(false);
            }
        });
    };

    const handleBack = () => {
        router.visit('/contas-receber');
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center space-x-4">
                    <button
                        onClick={handleBack}
                        className="text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        Nova Conta a Receber
                    </h2>
                </div>
            }
        >
            <div className="py-12">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Número do Documento */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FileText className="inline mr-2" size={16} />
                                            Número do Documento
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.numero_documento}
                                            onChange={(e) => handleInputChange('numero_documento', e.target.value)}
                                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                errors.numero_documento ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            placeholder="Ex: NF-001, REC-001"
                                        />
                                        {errors.numero_documento && (
                                            <p className="text-red-500 text-xs mt-1">{errors.numero_documento}</p>
                                        )}
                                    </div>

                                    {/* Cliente */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <User className="inline mr-2" size={16} />
                                            Cliente *
                                        </label>
                                        <select
                                            value={formData.id_cliente}
                                            onChange={(e) => handleInputChange('id_cliente', parseInt(e.target.value))}
                                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                                </div>

                                {/* Descrição */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <FileText className="inline mr-2" size={16} />
                                        Descrição *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.descricao}
                                        onChange={(e) => handleInputChange('descricao', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            errors.descricao ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="Descrição da conta a receber"
                                    />
                                    {errors.descricao && (
                                        <p className="text-red-500 text-xs mt-1">{errors.descricao}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Categoria */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <Tag className="inline mr-2" size={16} />
                                            Categoria *
                                        </label>
                                        <select
                                            value={formData.categoria}
                                            onChange={(e) => handleInputChange('categoria', e.target.value)}
                                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                errors.categoria ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                        >
                                            <option value="">Selecione uma categoria</option>
                                            <option value="venda">Venda</option>
                                            <option value="servico">Serviço</option>
                                            <option value="outros">Outros</option>
                                        </select>
                                        {errors.categoria && (
                                            <p className="text-red-500 text-xs mt-1">{errors.categoria}</p>
                                        )}
                                    </div>

                                    {/* Tipo de Documento */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <File className="inline mr-2" size={16} />
                                            Tipo de Documento *
                                        </label>
                                        <select
                                            value={formData.tipo_documento}
                                            onChange={(e) => handleInputChange('tipo_documento', e.target.value)}
                                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                errors.tipo_documento ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                        >
                                            <option value="">Selecione o tipo</option>
                                            <option value="nota_fiscal">Nota Fiscal</option>
                                            <option value="boleto">Boleto</option>
                                            <option value="recibo">Recibo</option>
                                            <option value="outros">Outros</option>
                                        </select>
                                        {errors.tipo_documento && (
                                            <p className="text-red-500 text-xs mt-1">{errors.tipo_documento}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Ponto de Venda */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Ponto de Venda *
                                        </label>
                                        <select
                                            value={formData.id_pdv}
                                            onChange={(e) => handleInputChange('id_pdv', parseInt(e.target.value))}
                                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                errors.id_pdv ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                        >
                                            <option value={0}>Selecione um ponto de venda</option>
                                            {pontosVenda.map((pdv) => (
                                                <option key={pdv.id_pdv} value={pdv.id_pdv}>
                                                    {pdv.nome}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.id_pdv && (
                                            <p className="text-red-500 text-xs mt-1">{errors.id_pdv}</p>
                                        )}
                                    </div>

                                    {/* Venda (opcional) */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Venda (opcional)
                                        </label>
                                        <select
                                            value={formData.id_venda || 0}
                                            onChange={(e) => handleInputChange('id_venda', parseInt(e.target.value) || null)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value={0}>Selecione uma venda (opcional)</option>
                                            {vendas.map((venda) => (
                                                <option key={venda.id_venda} value={venda.id_venda}>
                                                    Venda #{venda.id_venda} - {venda.cliente?.nome} - R$ {venda.valor_total?.toFixed(2)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Valor Original */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <DollarSign className="inline mr-2" size={16} />
                                            Valor Original *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={formData.valor_original}
                                            onChange={(e) => handleInputChange('valor_original', parseFloat(e.target.value) || 0)}
                                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                errors.valor_original ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            placeholder="0,00"
                                        />
                                        {errors.valor_original && (
                                            <p className="text-red-500 text-xs mt-1">{errors.valor_original}</p>
                                        )}
                                    </div>

                                    {/* Data de Vencimento */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <Calendar className="inline mr-2" size={16} />
                                            Data de Vencimento *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.data_vencimento}
                                            onChange={(e) => handleInputChange('data_vencimento', e.target.value)}
                                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                errors.data_vencimento ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                        {errors.data_vencimento && (
                                            <p className="text-red-500 text-xs mt-1">{errors.data_vencimento}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Total de Parcelas */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Total de Parcelas
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="999"
                                        value={formData.total_parcelas}
                                        onChange={(e) => handleInputChange('total_parcelas', parseInt(e.target.value) || 1)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="1"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Se maior que 1, será criada uma conta para cada parcela
                                    </p>
                                </div>

                                {/* Observações */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Observações
                                    </label>
                                    <textarea
                                        value={formData.observacoes}
                                        onChange={(e) => handleInputChange('observacoes', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                        placeholder="Observações adicionais..."
                                        maxLength={500}
                                    />
                                </div>

                                {/* Botões */}
                                <div className="flex justify-end space-x-4 pt-6 border-t">
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                        disabled={loading}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                                    >
                                        <Save size={16} />
                                        <span>{loading ? 'Salvando...' : 'Salvar'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}