import React from 'react';
import { Calendar, DollarSign, User, Package, FileText } from 'lucide-react';
import { StockEntry, Supplier } from '../types';
import InvoiceFileViewer from './InvoiceFileViewer';

interface StockHistoryProps {
  stockHistory: StockEntry[];
  suppliers: Supplier[];
}

export const StockHistory: React.FC<StockHistoryProps> = ({ stockHistory, suppliers }) => {
  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || 'Fornecedor não encontrado';
  };

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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  if (!stockHistory || stockHistory.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">Nenhum histórico de estoque disponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
        <Package className="w-5 h-5" />
        Histórico de Estoque
      </h3>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {stockHistory
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((entry) => (
            <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  {formatDate(entry.date)}
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-800">
                    +{entry.quantity} unidades
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-gray-600">Preço:</span>
                  <span className="font-medium">{formatCurrency(entry.purchasePrice)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">Fornecedor:</span>
                  <span className="font-medium truncate">{getSupplierName(entry.supplierId)}</span>
                </div>
              </div>
              
              {(entry.notes || entry.invoiceFile) && (
                <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
                  {entry.notes && (
                    <div className="flex items-start gap-2 text-sm">
                      <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="text-gray-600">{entry.notes}</span>
                    </div>
                  )}
                  {entry.invoiceFile && (
                    <InvoiceFileViewer 
                      invoiceFile={entry.invoiceFile} 
                      className="text-sm"
                    />
                  )}
                </div>
              )}
              
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Total: {formatCurrency((entry.quantity || 0) * (entry.purchasePrice || 0))}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};