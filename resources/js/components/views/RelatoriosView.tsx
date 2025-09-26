import React, { useState, useMemo } from 'react';
import { TrendingUp, DollarSign, Package, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { Sale, Product } from '../../types';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface RelatoriosViewProps {
  sales: Sale[];
  products: Product[];
}

type TimeFilter = 'week' | 'month' | 'year';

const RelatoriosView: React.FC<RelatoriosViewProps> = ({ sales, products }) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const salesToday = sales.filter(s => new Date(s.date) >= todayStart);
    const salesMonth = sales.filter(s => new Date(s.date) >= monthStart);

    const vendasHoje = salesToday.reduce((sum, s) => sum + s.total, 0);
    const vendasMes = salesMonth.reduce((sum, s) => sum + s.total, 0);
    const vendasHojeCount = salesToday.length;

    const productSales = new Map<string, { name: string; quantity: number }>();
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productSales.get(item.product.id);
        const quantity = existing ? existing.quantity + item.quantity : item.quantity;
        productSales.set(item.product.id, { name: item.product.name, quantity });
      });
    });
    const produtosMaisVendidos = [...productSales.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 3);

    const categorySales = new Map<string, number>();
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const category = item.product.category;
        const value = item.product.price * item.quantity;
        categorySales.set(category, (categorySales.get(category) || 0) + value);
      });
    });
    const vendasPorCategoria = [...categorySales.entries()].map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor).slice(0, 3);

    return {
      vendasHoje,
      vendasMes,
      vendasHojeCount,
      produtosAtivos: products.length,
      produtosMaisVendidos,
      vendasPorCategoria,
    };
  }, [sales, products]);

  const chartData = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let dataMap = new Map<string, number>();
    let labels: string[] = [];
    let data: number[] = [];
    let title = '';
    let dateFormat: Intl.DateTimeFormatOptions = {};

    switch (timeFilter) {
      case 'week':
        title = 'Vendas da Última Semana';
        startDate.setDate(now.getDate() - 6);
        dateFormat = { day: '2-digit', month: '2-digit' };
        for (let i = 0; i < 7; i++) {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + i);
          const key = d.toISOString().split('T')[0];
          dataMap.set(key, 0);
        }
        sales.forEach(sale => {
          const saleDate = new Date(sale.date);
          if (saleDate >= startDate) {
            const key = saleDate.toISOString().split('T')[0];
            dataMap.set(key, (dataMap.get(key) || 0) + sale.total);
          }
        });
        break;
      
      case 'month':
        title = 'Vendas do Último Mês';
        startDate.setDate(now.getDate() - 29);
        dateFormat = { day: '2-digit', month: '2-digit' };
        for (let i = 0; i < 30; i++) {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + i);
          const key = d.toISOString().split('T')[0];
          dataMap.set(key, 0);
        }
        sales.forEach(sale => {
          const saleDate = new Date(sale.date);
          if (saleDate >= startDate) {
            const key = saleDate.toISOString().split('T')[0];
            dataMap.set(key, (dataMap.get(key) || 0) + sale.total);
          }
        });
        break;

      case 'year':
        title = 'Vendas do Último Ano';
        startDate.setFullYear(now.getFullYear() - 1);
        startDate.setDate(1);
        dateFormat = { month: 'short', year: '2-digit' };
        for (let i = 0; i < 12; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          dataMap.set(key, 0);
        }
        sales.forEach(sale => {
          const saleDate = new Date(sale.date);
          if (saleDate >= startDate) {
            const key = `${saleDate.getFullYear()}-${saleDate.getMonth()}`;
            dataMap.set(key, (dataMap.get(key) || 0) + sale.total);
          }
        });
        dataMap = new Map([...dataMap.entries()].sort((a,b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()));
        break;
    }
    
    dataMap.forEach((value, key) => {
      const dateKey = timeFilter === 'year' ? new Date(parseInt(key.split('-')[0]), parseInt(key.split('-')[1])) : new Date(key);
      labels.push(dateKey.toLocaleDateString('pt-BR', dateFormat));
      data.push(parseFloat(value.toFixed(2)));
    });

    return { labels, data, title };
  }, [sales, timeFilter]);

  const chartOptions: ApexOptions = {
    chart: {
      type: 'area',
      height: 350,
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'inherit',
    },
    colors: ['#3B82F6'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100],
      },
    },
    xaxis: {
      categories: chartData.labels,
      labels: { style: { colors: '#6B7280' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: '#6B7280' },
        formatter: (val) => `R$ ${val.toFixed(0)}`,
      },
    },
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 4,
    },
    tooltip: {
      x: { format: 'dd MMM' },
      y: { formatter: (val) => `R$ ${val.toFixed(2)}` },
      theme: 'light',
    },
  };

  const series = [{ name: 'Vendas', data: chartData.data }];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between"><p className="text-sm text-gray-600">Vendas Hoje</p><DollarSign className="text-green-500" size={32} /></div>
          <p className="text-2xl font-bold text-gray-800 mt-2">R$ {stats.vendasHoje.toFixed(2)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between"><p className="text-sm text-gray-600">Vendas do Mês</p><TrendingUp className="text-blue-500" size={32} /></div>
          <p className="text-2xl font-bold text-gray-800 mt-2">R$ {stats.vendasMes.toFixed(2)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between"><p className="text-sm text-gray-600">Produtos Ativos</p><Package className="text-purple-500" size={32} /></div>
          <p className="text-2xl font-bold text-gray-800 mt-2">{stats.produtosAtivos}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between"><p className="text-sm text-gray-600">Nº de Vendas Hoje</p><ShoppingCart className="text-orange-500" size={32} /></div>
          <p className="text-2xl font-bold text-gray-800 mt-2">{stats.vendasHojeCount}</p>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2 sm:mb-0">{chartData.title}</h3>
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {(['week', 'month', 'year'] as TimeFilter[]).map(filter => (
              <button key={filter} onClick={() => setTimeFilter(filter)} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${timeFilter === filter ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
                {filter === 'week' ? 'Semana' : filter === 'month' ? 'Mês' : 'Ano'}
              </button>
            ))}
          </div>
        </div>
        <ReactApexChart options={chartOptions} series={series} type="area" height={350} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Produtos Mais Vendidos</h3>
          <div className="space-y-3">
            {stats.produtosMaisVendidos.map((produto, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-700 truncate pr-4">{produto.name}</span>
                <span className="font-semibold text-blue-600 flex-shrink-0">{Math.round(produto.quantity)} un.</span>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Vendas por Categoria</h3>
          <div className="space-y-3">
            {stats.vendasPorCategoria.map((cat, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-700">{cat.categoria}</span>
                <span className="font-semibold text-green-600">R$ {cat.valor.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RelatoriosView;
