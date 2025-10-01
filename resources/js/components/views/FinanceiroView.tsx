import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AccountPayable, AccountReceivable, Supplier, Customer, Sale } from '../../types';
import FluxoCaixa from '../financeiro/FluxoCaixa';
import ContasPagar from '../financeiro/ContasPagar';
import ContasReceber from '../financeiro/ContasReceber';
import LancamentoForm from '../financeiro/LancamentoForm';

interface FluxoCaixaData {
  dailyData: {
    date: string;
    entradas: number;
    saidas: number;
    saldo: number;
  }[];
  statistics: {
    totalEntradas: number;
    totalSaidas: number;
    saldoTotal: number;
    entradasHoje: number;
    saidasHoje: number;
    saldoHoje: number;
  };
}

interface FinanceiroViewProps {
  accountsPayable: AccountPayable[];
  accountsReceivable: AccountReceivable[];
  suppliers: Supplier[];
  customers: Customer[];
  sales: Sale[];
  fluxoCaixaData?: FluxoCaixaData;
  statistics?: {
    totalPagar: number;
    totalReceber: number;
    vendasHoje: number;
    contasVencidas: number;
  };
  payableStatistics?: {
    totalPendente: number;
    totalVencido: number;
    totalPagoMes: number;
    quantidadeVencidas: number;
  };
  receivableStatistics?: {
    totalPendente: number;
    totalVencido: number;
    totalRecebidoMes: number;
    quantidadeVencidas: number;
  };
  onAddEntry: (entry: Partial<AccountPayable> | Partial<AccountReceivable>, type: 'payable' | 'receivable') => void;
  onUpdateStatus: (id: number, type: 'payable' | 'receivable', status?: string) => void;
}

type FinanceiroSubView = 'fluxo' | 'pagar' | 'receber';

const FinanceiroView: React.FC<FinanceiroViewProps> = (props) => {
  const [subView, setSubView] = useState<FinanceiroSubView>('fluxo');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<'payable' | 'receivable'>('payable');

  const handleOpenForm = (type: 'payable' | 'receivable') => {
    setFormType(type);
    setIsFormOpen(true);
  };
  
  const renderSubView = () => {
    switch (subView) {
      case 'fluxo':
        return <FluxoCaixa 
          accountsPayable={props.accountsPayable} 
          accountsReceivable={props.accountsReceivable} 
          sales={props.sales}
          statistics={props.statistics}
          fluxoCaixaData={props.fluxoCaixaData}
        />;
      case 'pagar':
        return <ContasPagar 
          accounts={props.accountsPayable} 
          suppliers={props.suppliers} 
          onUpdateStatus={props.onUpdateStatus} 
          onAdd={() => handleOpenForm('payable')}
          totalPendente={props.payableStatistics?.totalPendente || 0}
          totalVencido={props.payableStatistics?.totalVencido || 0}
          totalPagoMes={props.payableStatistics?.totalPagoMes || 0}
          quantidadeVencidas={props.payableStatistics?.quantidadeVencidas || 0}
        />;
      case 'receber':
        return <ContasReceber 
          accounts={props.accountsReceivable} 
          customers={props.customers} 
          onUpdateStatus={props.onUpdateStatus} 
          onAdd={() => handleOpenForm('receivable')}
          totalPendente={props.receivableStatistics?.totalPendente || 0}
          totalVencido={props.receivableStatistics?.totalVencido || 0}
          totalRecebidoMes={props.receivableStatistics?.totalRecebidoMes || 0}
          quantidadeVencidas={props.receivableStatistics?.quantidadeVencidas || 0}
        />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-2 flex space-x-2">
        {(['fluxo', 'pagar', 'receber'] as FinanceiroSubView[]).map(view => (
          <button
            key={view}
            onClick={() => setSubView(view)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              subView === view ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {view === 'fluxo' ? 'Fluxo de Caixa' : view === 'pagar' ? 'Contas a Pagar' : 'Contas a Receber'}
          </button>
        ))}
      </div>

      <motion.div
        key={subView}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {renderSubView()}
      </motion.div>

      <LancamentoForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={props.onAddEntry}
        type={formType}
        suppliers={props.suppliers}
        customers={props.customers}
      />
    </div>
  );
};

export default FinanceiroView;
