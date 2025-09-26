import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Wallet, CreditCard, Banknote, Smartphone, Filter, Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { AccountPayable, AccountReceivable, Sale } from '../../types';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface FinancialStatistics {
  totalReceivable: number;
  totalPayable: number;
  totalReceived: number;
  totalPaid: number;
  pendingReceivable: number;
  pendingPayable: number;
  overdueReceivable: number;
  overduePayable: number;
  cashFlow: number;
  projectedCashFlow: number;
}

interface FluxoCaixaProps {
  accountsPayable: AccountPayable[];
  accountsReceivable: AccountReceivable[];
  sales: Sale[];
  statistics?: FinancialStatistics;
}

const getPaymentMethodBadge = (method: 'dinheiro' | 'cartao' | 'pix') => {
  const styles = {
    dinheiro: 'bg-green-100 text-green-800',
    cartao: 'bg-blue-100 text-blue-800',
    pix: 'bg-purple-100 text-purple-800',
  };
  const text = {
    dinheiro: 'Dinheiro',
    cartao: 'Cartão',
    pix: 'PIX',
  };
  const icons = {
    dinheiro: <Banknote size={14} className="mr-1.5" />,
    cartao: <CreditCard size={14} className="mr-1.5" />,
    pix: <Smartphone size={14} className="mr-1.5" />,
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${styles[method]}`}>
      {icons[method]}
      {text[method]}
    </span>
  );
};

const FluxoCaixa: React.FC<FluxoCaixaProps> = ({ accountsPayable, accountsReceivable, sales, statistics }) => {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    paymentMethods: ['dinheiro', 'cartao', 'pix'] as ('dinheiro' | 'cartao' | 'pix')[],
    showSales: true,
    showReceivables: true,
    showPayables: true
  });
  
  const [showFilters, setShowFilters] = useState(false);

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

  const formatDate = (dateString: string | null | undefined) => {
    // Verificar se a data é válida
    if (!dateString) {
      return 'Data não informada';
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    
    return date.toLocaleDateString('pt-BR');
  };

  // Calcular estatísticas se não fornecidas
  const calculatedStats = useMemo(() => {
    if (statistics) return statistics;

    const totalReceivable = accountsReceivable.reduce((sum, acc) => sum + (acc.valor_original || 0), 0);
    const totalPayable = accountsPayable.reduce((sum, acc) => sum + (acc.valor_original || 0), 0);
    const totalReceived = accountsReceivable.filter(acc => acc.status === 'pago').reduce((sum, acc) => sum + (acc.valor_recebido || 0), 0);
    const totalPaid = accountsPayable.filter(acc => acc.status === 'pago').reduce((sum, acc) => sum + (acc.valor_pago || 0), 0);
    const pendingReceivable = accountsReceivable.filter(acc => acc.status === 'pendente').reduce((sum, acc) => sum + (acc.valor_original || 0), 0);
    const pendingPayable = accountsPayable.filter(acc => acc.status === 'pendente').reduce((sum, acc) => sum + (acc.valor_original || 0), 0);
    const overdueReceivable = accountsReceivable.filter(acc => acc.status === 'vencido').reduce((sum, acc) => sum + (acc.valor_original || 0), 0);
    const overduePayable = accountsPayable.filter(acc => acc.status === 'vencido').reduce((sum, acc) => sum + (acc.valor_original || 0), 0);

    return {
      totalReceivable,
      totalPayable,
      totalReceived,
      totalPaid,
      pendingReceivable,
      pendingPayable,
      overdueReceivable,
      overduePayable,
      cashFlow: totalReceived - totalPaid,
      projectedCashFlow: pendingReceivable - pendingPayable
    };
  }, [accountsPayable, accountsReceivable, statistics]);

  const filteredData = useMemo(() => {
    const isDateInRange = (date: string | undefined | null) => {
      if (!date || typeof date !== 'string') return false;
      if (!filters.startDate && !filters.endDate) return true;
      
      try {
        const itemDate = new Date(date);
        if (isNaN(itemDate.getTime())) return false;
        
        const start = filters.startDate ? new Date(filters.startDate) : new Date('1900-01-01');
        const end = filters.endDate ? new Date(filters.endDate) : new Date('2100-12-31');
        return itemDate >= start && itemDate <= end;
      } catch (error) {
        return false;
      }
    };

    const filteredSales = filters.showSales ? sales.filter(sale => 
      isDateInRange(sale.created_at) && 
      sale.payment_method && 
      filters.paymentMethods.includes(sale.payment_method as 'dinheiro' | 'cartao' | 'pix')
    ) : [];

    const filteredReceivables = filters.showReceivables ? accountsReceivable.filter(acc => 
      isDateInRange(acc.data_vencimento)
    ) : [];

    const filteredPayables = filters.showPayables ? accountsPayable.filter(acc => 
      isDateInRange(acc.data_vencimento)
    ) : [];

    return { sales: filteredSales, receivables: filteredReceivables, payables: filteredPayables };
  }, [sales, accountsReceivable, accountsPayable, filters]);

  // Dados para o gráfico de fluxo de caixa
  const chartData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    const dailyData = last30Days.map(date => {
      const dayReceived = accountsReceivable
        .filter(acc => acc.data_recebimento && typeof acc.data_recebimento === 'string' && acc.data_recebimento.startsWith(date))
        .reduce((sum, acc) => sum + (acc.valor_recebido || 0), 0);
      
      const dayPaid = accountsPayable
        .filter(acc => acc.data_pagamento && typeof acc.data_pagamento === 'string' && acc.data_pagamento.startsWith(date))
        .reduce((sum, acc) => sum + (acc.valor_pago || 0), 0);

      const daySales = sales
        .filter(sale => sale.created_at && typeof sale.created_at === 'string' && sale.created_at.startsWith(date))
        .reduce((sum, sale) => sum + (sale.total || 0), 0);

      return {
        date,
        received: dayReceived + daySales,
        paid: dayPaid,
        net: (dayReceived + daySales) - dayPaid
      };
    });

    return dailyData;
  }, [accountsReceivable, accountsPayable, sales]);

  const chartOptions: ApexOptions = {
    chart: {
      type: 'line',
      height: 350,
      toolbar: { show: false }
    },
    colors: ['#10B981', '#EF4444', '#3B82F6'],
    stroke: {
      width: 3,
      curve: 'smooth'
    },
    xaxis: {
      categories: chartData.map(item => new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
      labels: {
        style: {
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      labels: {
        formatter: (value) => formatCurrency(value)
      }
    },
    tooltip: {
      y: {
        formatter: (value) => formatCurrency(value)
      }
    },
    legend: {
      position: 'top'
    },
    grid: {
      strokeDashArray: 3
    }
  };

  const chartSeries = [
    {
      name: 'Entradas',
      data: chartData.map(item => item.received)
    },
    {
      name: 'Saídas',
      data: chartData.map(item => item.paid)
    },
    {
      name: 'Saldo Líquido',
      data: chartData.map(item => item.net)
    }
  ];

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Fluxo de Caixa Atual</p>
              <p className="text-2xl font-bold">{formatCurrency(calculatedStats.cashFlow)}</p>
              <p className="text-green-100 text-xs mt-1">
                {calculatedStats.cashFlow >= 0 ? 'Positivo' : 'Negativo'}
              </p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              {calculatedStats.cashFlow >= 0 ? (
                <TrendingUp className="h-6 w-6" />
              ) : (
                <TrendingDown className="h-6 w-6" />
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Projeção</p>
              <p className="text-2xl font-bold">{formatCurrency(calculatedStats.projectedCashFlow)}</p>
              <p className="text-blue-100 text-xs mt-1">Pendente</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Total a Receber</p>
              <p className="text-2xl font-bold">{formatCurrency(calculatedStats.pendingReceivable)}</p>
              <p className="text-emerald-100 text-xs mt-1">Pendente</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <ArrowUp className="h-6 w-6" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Total a Pagar</p>
              <p className="text-2xl font-bold">{formatCurrency(calculatedStats.pendingPayable)}</p>
              <p className="text-red-100 text-xs mt-1">Pendente</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <ArrowDown className="h-6 w-6" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Gráfico de Fluxo de Caixa */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-md p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Fluxo de Caixa - Últimos 30 Dias</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter size={16} />
            <span>Filtros</span>
          </button>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-gray-50 rounded-lg"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exibir</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.showSales}
                      onChange={(e) => setFilters(prev => ({ ...prev, showSales: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Vendas</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.showReceivables}
                      onChange={(e) => setFilters(prev => ({ ...prev, showReceivables: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Contas a Receber</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.showPayables}
                      onChange={(e) => setFilters(prev => ({ ...prev, showPayables: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Contas a Pagar</span>
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <ReactApexChart
          options={chartOptions}
          series={chartSeries}
          type="line"
          height={350}
        />
      </motion.div>

      {/* Resumo de Vencimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contas Vencidas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contas Vencidas</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-red-800">Contas a Receber Vencidas</p>
                <p className="text-lg font-bold text-red-900">{formatCurrency(calculatedStats.overdueReceivable)}</p>
              </div>
              <ArrowUp className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-red-800">Contas a Pagar Vencidas</p>
                <p className="text-lg font-bold text-red-900">{formatCurrency(calculatedStats.overduePayable)}</p>
              </div>
              <ArrowDown className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </motion.div>

        {/* Resumo Geral */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo Geral</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-800">Total Recebido</p>
                <p className="text-lg font-bold text-green-900">{formatCurrency(calculatedStats.totalReceived)}</p>
              </div>
              <ArrowUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-red-800">Total Pago</p>
                <p className="text-lg font-bold text-red-900">{formatCurrency(calculatedStats.totalPaid)}</p>
              </div>
              <ArrowDown className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default FluxoCaixa;
