import React, { useState, useMemo } from 'react';
import { TrendingUp, DollarSign, Package, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { Sale } from '../../types';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface RelatoriosViewProps {
  sales: Sale[];
  vendas_hoje_valor: number;
  vendas_mes_valor: number;
  vendas_hoje_numero: number;
  vendas_ano_valor: Record<string, Record<string, number | null>>;
  produtosAtivos: number;
}

type TimeFilter = 'week' | 'month' | 'year';

const RelatoriosView: React.FC<RelatoriosViewProps> = ({ sales, vendas_hoje_valor, vendas_mes_valor, vendas_hoje_numero, vendas_ano_valor, produtosAtivos }) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');

  const stats = useMemo(() => {

    const vendasHoje = vendas_hoje_valor;
    const vendasMes = vendas_mes_valor;
    const vendasHojeCount = vendas_hoje_numero;


    const categorySales = new Map<string, number>();
    
    const vendasPorCategoria = [...categorySales.entries()].map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor).slice(0, 3);

    return {
      vendasHoje,
      vendasMes,
      vendasHojeCount,
      //produtosAtivos: sales.flatMap(s => s.items.map(i => i.product.id)).filter((id, i, arr) => arr.indexOf(id) === i).length,
      vendasPorCategoria,
    };
  }, [sales]);

  const chartData = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let dataMap = new Map<string, number>();
    let labels: string[] = [];
    let data: number[] = [];
    let title = '';
    let dateFormat: Intl.DateTimeFormatOptions = {};
    
    let mesAtual = now.getMonth() + 1;
    let vendasMesAtual = vendas_ano_valor[mesAtual || 0] || 0;
    
    switch (timeFilter) {
      case 'week':
        title = 'Vendas da Última Semana';
        startDate.setDate(now.getDate() - 5);
        dateFormat = { day: '2-digit', month: '2-digit' };
        
        for (let i = 0; i < 7; i++) {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + i);
          const key = d.toISOString().split('T')[0];
          dataMap.set(key, vendasMesAtual[d.getDate() - 1|| 0] || 0);
        }
        break;
      
      case 'month':
        title = 'Vendas do Último Mês';
        startDate.setDate(now.getDate() - 28);
        dateFormat = { day: '2-digit', month: '2-digit' };

        for (let i = 0; i < 30; i++) {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + i);
          const key = d.toISOString().split('T')[0];
          dataMap.set(key, vendasMesAtual[d.getDate() - 1|| 0] || 0);
        }

        break;

      case 'year':
        title = 'Vendas do Último Ano';
        // ... (seu código de processamento de vendas_por_mes_total continua igual) ...
        let array_vendas_ano = Object.values(vendas_ano_valor);
        let vendas_por_mes_total = array_vendas_ano.map((mes) => {
          if (mes === null)
            return 0;
          let valores_dias_array = Object.values(mes);
          return valores_dias_array.reduce((acc, cur) => (acc ?? 0) + (cur ?? 0), 0);
        });
        // --- FIM do seu código ---

        // --- INÍCIO DA CORREÇÃO ---

        for (let i = 0; i < 12; i++) {
          // 1. Cria a data para o mês (ex: Nov, Out, Set...)
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

          // 2. Cria a chave (ex: "2025-10" para Nov 2025)
          const key = `${d.getFullYear()}-${d.getMonth()}`;

          // 3. Pega o índice do mês (0-11) e o ano
          const monthIndex = d.getMonth(); // Ex: 10 (Novembro)
          const year = d.getFullYear();

          let dataDoMes = 0;

          // 4. Pega o dado do mês CORRETO.
          // (Isto assume que 'vendas_por_mes_total' só tem dados do ano atual, 2025)
          if (year === now.getFullYear()) {
            dataDoMes = vendas_por_mes_total[monthIndex] ?? 0;
          }
          // Se for do ano anterior (ex: Dez 2024), precisamos dos dados dele.
          // Se 'vendas_por_mes_total' já inclui dados do ano passado,
          // você precisará de uma lógica diferente.

          // Assumindo que seu PHP só retorna dados do ano atual:
          // Para Dezembro 2024 (i=11), d.getMonth() será 11.
          // Se `vendas_por_mes_total[11]` for o total de Dez 2025, está errado.

          // **** SOLUÇÃO SIMPLES ****
          // Vamos assumir que `vendas_por_mes_total` [0] é Jan, [1] é Fev...
          // E seu backend (PHP) só retorna dados do ano atual (2025).
          if (year === now.getFullYear()) {
            dataMap.set(key, vendas_por_mes_total[monthIndex] ?? 0);
          } else {
            // É um mês do ano anterior (ex: Dez 2024), 
            // para o qual não temos dados no array.
            dataMap.set(key, 0);
            // NOTA: Se seu backend PUDER retornar dados de Dez 2024, 
            // a lógica do 'vendas_por_mes_total' precisa mudar.
          }
        }

        // 5. CORREÇÃO DA ORDENAÇÃO
        dataMap = new Map([...dataMap.entries()].sort((a, b) => {
          const [aYear, aMonth] = a[0].split('-').map(Number);
          const [bYear, bMonth] = b[0].split('-').map(Number);
          return new Date(aYear, aMonth).getTime() - new Date(bYear, bMonth).getTime();
        }));

        break;
    // --- FIM DA CORREÇÃO ---
    }
    
    dataMap.forEach((value, key) => {
      const dateKey = timeFilter === 'year' ? new Date(parseInt(key.split('-')[0]), parseInt(key.split('-')[1])) : new Date(key);
      labels.push(dateKey.toLocaleDateString('pt-BR', dateFormat));
      data.push(typeof value === 'number' ? value : parseFloat(value as unknown as string));
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
          <p className="text-2xl font-bold text-gray-800 mt-2">R$ {stats.vendasHoje}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between"><p className="text-sm text-gray-600">Vendas do Mês</p><TrendingUp className="text-blue-500" size={32} /></div>
          <p className="text-2xl font-bold text-gray-800 mt-2">R$ {stats.vendasMes}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between"><p className="text-sm text-gray-600">Produtos Ativos</p><Package className="text-purple-500" size={32} /></div>
          <p className="text-2xl font-bold text-gray-800 mt-2">{produtosAtivos}</p>
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
            {/* {stats.produtosMaisVendidos.map((produto, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-700 truncate pr-4">{produto.name}</span>
                <span className="font-semibold text-blue-600 flex-shrink-0">{Math.round(produto.quantity)} un.</span>
              </div>
            ))} */}
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
