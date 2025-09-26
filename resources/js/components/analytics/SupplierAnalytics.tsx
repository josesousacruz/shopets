import React, { useMemo } from 'react';
import { Supplier, Product, StockEntry } from '../../types';
import { TrendingUp, TrendingDown, Package, DollarSign, Calendar, AlertTriangle } from 'lucide-react';

interface SupplierAnalyticsProps {
  suppliers: Supplier[];
  products: Product[];
  stockEntries: StockEntry[];
}

interface SupplierMetrics {
  id: string;
  name: string;
  totalProducts: number;
  totalPurchases: number;
  totalValue: number;
  averagePrice: number;
  lastPurchase: Date | null;
  reliability: 'high' | 'medium' | 'low';
  trend: 'up' | 'down' | 'stable';
}

export const SupplierAnalytics: React.FC<SupplierAnalyticsProps> = ({
  suppliers,
  products,
  stockEntries
}) => {
  const supplierMetrics = useMemo(() => {
    return suppliers.map(supplier => {
      const supplierProducts = products.filter(p => p.supplierId === supplier.id);
      const supplierStockEntries = stockEntries.filter(entry => 
        supplierProducts.some(p => p.id === entry.productId)
      );

      const totalPurchases = supplierStockEntries.length;
      const totalValue = supplierStockEntries.reduce((sum, entry) => 
        sum + (entry.quantity * entry.purchasePrice), 0
      );
      const averagePrice = totalPurchases > 0 ? totalValue / totalPurchases : 0;
      
      const lastPurchase = supplierStockEntries.length > 0 
        ? new Date(Math.max(...supplierStockEntries.map(e => new Date(e.date).getTime())))
        : null;

      // Calculate reliability based on consistency of deliveries
      const reliability: 'high' | 'medium' | 'low' = 
        totalPurchases >= 10 ? 'high' : 
        totalPurchases >= 5 ? 'medium' : 'low';

      // Calculate trend (simplified - in real app would use time-based analysis)
      const recentEntries = supplierStockEntries.slice(-5);
      const olderEntries = supplierStockEntries.slice(-10, -5);
      const recentAvg = recentEntries.reduce((sum, e) => sum + e.purchasePrice, 0) / recentEntries.length || 0;
      const olderAvg = olderEntries.reduce((sum, e) => sum + e.purchasePrice, 0) / olderEntries.length || 0;
      
      const trend: 'up' | 'down' | 'stable' = 
        recentAvg > olderAvg * 1.1 ? 'up' :
        recentAvg < olderAvg * 0.9 ? 'down' : 'stable';

      return {
        id: supplier.id,
        name: supplier.name,
        totalProducts: supplierProducts.length,
        totalPurchases,
        totalValue,
        averagePrice,
        lastPurchase,
        reliability,
        trend
      };
    }).sort((a, b) => b.totalValue - a.totalValue);
  }, [suppliers, products, stockEntries]);

  const topSuppliers = supplierMetrics.slice(0, 5);
  const totalSupplierValue = supplierMetrics.reduce((sum, s) => sum + (s.totalValue || 0), 0);

  const formatCurrency = (value: number | null | undefined) => {
    // Verificar se o valor é válido
    if (value === null || value === undefined || isNaN(value)) {
      return 'R$ 0,00';
    }
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: Date | null | undefined) => {
    // Verificar se a data é válida
    if (!date) {
      return 'Nunca';
    }
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida';
    }
    
    return dateObj.toLocaleDateString('pt-BR');
  };

  const getReliabilityColor = (reliability: string) => {
    switch (reliability) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-green-500" />;
      default: return <div className="w-4 h-4 bg-gray-300 rounded-full" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Fornecedores</p>
              <p className="text-2xl font-bold text-gray-900">{suppliers.length}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Valor Total de Compras</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSupplierValue)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Fornecedores Ativos</p>
              <p className="text-2xl font-bold text-gray-900">
                {suppliers.filter(s => s.status === 'active').length}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Média por Fornecedor</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalSupplierValue / suppliers.length || 0)}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Top Suppliers Table */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Top 5 Fornecedores</h3>
          <p className="text-sm text-gray-600">Ranking por valor total de compras</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fornecedor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produtos
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compras
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Compra
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confiabilidade
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tendência
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topSuppliers.map((supplier, index) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {index + 1}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {supplier.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {supplier.totalProducts}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {supplier.totalPurchases}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(supplier.totalValue)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(supplier.lastPurchase)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getReliabilityColor(supplier.reliability)}`}>
                      {supplier.reliability === 'high' ? 'Alta' : 
                       supplier.reliability === 'medium' ? 'Média' : 'Baixa'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getTrendIcon(supplier.trend)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts */}
      {supplierMetrics.some(s => s.reliability === 'low' || !s.lastPurchase) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-yellow-800">
                Atenção necessária
              </h4>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  {supplierMetrics
                    .filter(s => s.reliability === 'low')
                    .map(s => (
                      <li key={s.id}>
                        {s.name} tem baixa confiabilidade ({s.totalPurchases} compras)
                      </li>
                    ))}
                  {supplierMetrics
                    .filter(s => !s.lastPurchase)
                    .map(s => (
                      <li key={s.id}>
                        {s.name} nunca teve compras registradas
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};