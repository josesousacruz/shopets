import React from 'react';
import { Calendar, Package, DollarSign, FileText, ShoppingCart } from 'lucide-react';
import { PurchaseHistory as PurchaseHistoryType } from '../types';
import { motion } from 'framer-motion';
import InvoiceFileViewer from './InvoiceFileViewer';

interface PurchaseHistoryProps {
  purchases: PurchaseHistoryType[];
  supplierName: string;
}

export const PurchaseHistory: React.FC<PurchaseHistoryProps> = ({ purchases, supplierName }) => {
  const formatDate = (date: Date | null | undefined) => {
    // Verificar se a data é válida
    if (!date) {
      return 'Data não informada';
    }
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida';
    }
    
    return dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

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

  const totalPurchases = purchases.reduce((sum, purchase) => sum + (purchase.totalAmount || 0), 0);
  const totalQuantity = purchases.reduce((sum, purchase) => sum + (purchase.quantity || 0), 0);

  if (purchases.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <ShoppingCart className="mx-auto text-gray-400 mb-2" size={48} />
        <p className="text-gray-500">Nenhuma compra registrada com {supplierName}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total de Compras</p>
              <p className="text-2xl font-bold text-blue-800">{purchases.length}</p>
            </div>
            <ShoppingCart className="text-blue-500" size={32} />
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Valor Total</p>
              <p className="text-2xl font-bold text-green-800">{formatCurrency(totalPurchases)}</p>
            </div>
            <DollarSign className="text-green-500" size={32} />
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Itens Comprados</p>
              <p className="text-2xl font-bold text-purple-800">{totalQuantity}</p>
            </div>
            <Package className="text-purple-500" size={32} />
          </div>
        </div>
      </div>

      {/* Lista de Compras */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <FileText className="mr-2" size={20} />
            Histórico de Compras - {supplierName}
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preço Unitário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NF/Anexo
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchases
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((purchase, index) => (
                <motion.tr
                  key={purchase.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="text-gray-400 mr-2" size={16} />
                      <span className="text-sm text-gray-900">
                        {formatDate(purchase.date)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {purchase.productName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {purchase.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {formatCurrency(purchase.unitPrice)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(purchase.totalAmount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {purchase.invoiceNumber && (
                        <div className="text-sm text-gray-600">
                          NF: {purchase.invoiceNumber}
                        </div>
                      )}
                      {purchase.invoiceFile && (
                        <InvoiceFileViewer 
                          invoiceFile={purchase.invoiceFile} 
                          className="text-sm"
                          showLabel={false}
                        />
                      )}
                      {!purchase.invoiceNumber && !purchase.invoiceFile && (
                        <span className="text-sm text-gray-400 italic">Sem nota fiscal</span>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        

      </div>
    </div>
  );
};