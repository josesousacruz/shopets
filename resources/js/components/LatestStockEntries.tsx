import React, { useEffect, useState } from 'react';
import { Package, Calendar, DollarSign } from 'lucide-react';

interface StockEntry {
    id: number;
    fornecedor_nome: string;
    produto_nome: string;
    quantidade: number;
    valor_entrada: number;
    data_entrada: string;
    numero_nota_fiscal?: string;
}

interface LatestStockEntriesProps {
    className?: string;
    product_id: number | null;
}

export default function LatestStockEntries({ className = '', product_id }: LatestStockEntriesProps) {
    const [entries, setEntries] = useState<StockEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchLatestEntries();
    }, []);

    const fetchLatestEntries = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/estoque/latest-entries?product_id=${product_id}`);
            
            if (!response.ok) {
                throw new Error('Erro ao carregar entradas');
            }
            
            const data = await response.json();
            setEntries(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro desconhecido');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    if (loading) {
        return (
            <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
                <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Últimas Entradas no Estoque
                    </h3>
                </div>
                <div className="p-4">
                    <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
                <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Últimas Entradas no Estoque
                    </h3>
                </div>
                <div className="p-4">
                    <div className="text-center py-4 text-red-600 text-sm">
                        {error}
                    </div>
                </div>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
                <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Últimas Entradas no Estoque
                    </h3>
                </div>
                <div className="p-4">
                    <div className="text-center py-4 text-gray-500 text-sm">
                        Nenhuma entrada encontrada
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
            <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Últimas Entradas no Estoque
                </h3>
            </div>
            <div className="p-4 space-y-3">
                {entries.map((entry) => (
                    <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900 text-sm truncate">
                                    {entry.fornecedor_nome}
                                </span>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {entry.produto_nome}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                                <div className="flex items-center gap-1">
                                    <Package className="h-3 w-3" />
                                    <span>Qtd: {entry.quantidade}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span>{formatCurrency(entry.valor_entrada)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{entry.data_entrada}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}