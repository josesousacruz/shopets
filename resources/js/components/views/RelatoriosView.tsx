import React, { useState, useMemo, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { DollarSign, FileDown} from 'lucide-react';
import { motion } from 'framer-motion';
import RelatorioTabela from '../relatorio/RelatorioTabela';
import { Sale } from '../../types';
import { DateRangePicker, DateRange } from '@/components/DatePicker';
import { CartesianGrid, LabelList, Line, LineChart, XAxis, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { eachDayOfInterval, isSameMonth, endOfMonth, getWeek, format, differenceInCalendarDays, addDays } from 'date-fns';
import Swal from 'sweetalert2';

interface RelatoriosViewProps {
  sales: Sale[];
  vendas_ano_valor: Record<string, Record<string, number | null>>;
  produtosMaisVendidos: any;
  categoriasMaisVendidas: any;
  formasPagamentoMix: { nome: string; vendas: number; total: number }[];
  percentualParceladas: number;
  totalLiquidoIntervalo: number;
  vendasCountIntervalo: number;
  totalBrutoIntervalo: number;
  totalDescontoIntervalo: number;
}

 

type ListType = 'formas'|'produtos'|'categorias'|'vendas';

const RelatoriosView: React.FC<RelatoriosViewProps> = ({ sales, vendas_ano_valor, produtosMaisVendidos, categoriasMaisVendidas, formasPagamentoMix, totalLiquidoIntervalo, vendasCountIntervalo, totalBrutoIntervalo, totalDescontoIntervalo }) => { 
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(new Date().setDate(new Date().getDate() - 30)), to: new Date() });
  const [listType, setListType] = useState<ListType>('vendas');
  const [isLoading, setIsLoading] = useState(false);

  const renderSkeletonCircleCard = () => (
    <div className="flex items-center justify-between">
      <div className="flex-1 space-y-3 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
        <div className="h-8 bg-gray-200 rounded w-40"></div>
        <div className="h-3 bg-gray-200 rounded w-48"></div>
      </div>
      <div className="flex flex-col items-center justify-center">
        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-gray-200"></div>
        <div className="h-3 bg-gray-200 rounded w-24 mt-2"></div>
      </div>
    </div>
  );
  const renderSkeletonAmountCard = () => (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
      <div className="h-7 bg-gray-200 rounded w-32"></div>
    </div>
  );
  const renderSkeletonTableRows = (rows: number = 5) => (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-[1fr_90px_120px] items-center gap-2">
          <div className="h-5 bg-gray-200 rounded"></div>
          <div className="h-5 bg-gray-200 rounded"></div>
          <div className="h-5 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );
  const renderSkeletonSalesRows = (rows: number = 8) => (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-[80px_80px_120px_120px_120px] items-center gap-2">
          <div className="h-5 bg-gray-200 rounded"></div>
          <div className="h-5 bg-gray-200 rounded"></div>
          <div className="h-5 bg-gray-200 rounded"></div>
          <div className="h-5 bg-gray-200 rounded"></div>
          <div className="h-5 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );

  useEffect(() => {
    const start = () => setIsLoading(true);
    const finish = () => setIsLoading(false);
    const removeStart = router.on('start', start);
    const removeFinish = router.on('finish', finish);
    return () => {
      try { removeStart?.(); } catch {}
      try { removeFinish?.(); } catch {}
    };
  }, []);
  const listTypeLabel = (t: ListType) => ({
    formas: 'Formas de Pagamento',
    produtos: 'Produtos',
    categorias: 'Categorias',
    vendas: 'Vendas',
  }[t]);
  useEffect(() => {
    if (dateRange?.from || dateRange?.to) {
      const start = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
      const end = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;
      router.get('/relatorios', { start, end }, { preserveScroll: true, preserveState: true });
    }
  }, [dateRange]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

  const chartLine = useMemo(() => {
    const from = dateRange?.from;
    const to = dateRange?.to;
    if (!from || !to) return { title: 'VENDAS - intervalo não selecionado', data: [] as { xLabel: string; valor: number; label?: string }[] };
    const minStart = differenceInCalendarDays(to, from) + 1 < 7 ? addDays(to, -6) : from;
    const days = eachDayOfInterval({ start: minStart, end: to });
    const raw = days.map((d) => {
      const m = String(d.getMonth() + 1);
      const day = String(d.getDate());
      const valor = Number((vendas_ano_valor?.[m]?.[day] ?? 0) || 0);
      return { date: d, xLabel: format(d, 'dd/MM'), valor, monthKey: format(d, 'yyyy-MM'), weekKey: `${format(d, 'yyyy')}-${String(getWeek(d)).padStart(2, '0')}` };
    });
    const len = differenceInCalendarDays(to, minStart) + 1;
    const fullMonth = isSameMonth(minStart, to) && format(minStart, 'dd') === '01' && format(to, 'dd') === format(endOfMonth(to), 'dd');
    const monthsInRange = new Set(raw.map((r) => r.monthKey));
    const labelIndices = new Set<number>();
    if (len <= 7) {
      raw.forEach((_, i) => labelIndices.add(i));
    } else if (fullMonth) {
      const byWeek = new Map<string, { i: number; v: number }>();
      raw.forEach((r, i) => {
        const curr = byWeek.get(r.weekKey);
        if (!curr || r.valor > curr.v) byWeek.set(r.weekKey, { i, v: r.valor });
      });
      Array.from(byWeek.values()).forEach((w) => labelIndices.add(w.i));
    }
    let data: { xLabel: string; valor: number; label?: string }[] = [];
    if (len > 90) {
      const byMonth = new Map<string, { valor: number; date: Date }>();
      raw.forEach((r) => {
        const curr = byMonth.get(r.monthKey);
        if (!curr || r.valor > curr.valor) byMonth.set(r.monthKey, { valor: r.valor, date: r.date });
      });
      data = Array.from(byMonth.entries())
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([mk, info]) => ({
          xLabel: format(info.date, 'MM/yy'),
          valor: info.valor,
          label: info.valor > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(info.valor) : undefined,
        }));
    } else {
      data = raw.map((r, i) => ({
        xLabel: r.xLabel,
        valor: r.valor,
        label: labelIndices.has(i) && r.valor > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.valor) : undefined,
      }));
    }
    let title = '';
    const startYear = format(minStart, 'yyyy');
    const endYear = format(to, 'yyyy');
    if (len <= 7) title = 'VENDAS - Últimos 7 dias';
    else if (startYear !== endYear) title = `VENDAS - ${startYear} – ${endYear}`;
    else title = `VENDAS - ${format(minStart, 'dd/MM/yyyy')} até ${format(to, 'dd/MM/yyyy')}`;
    return { title, data };
  }, [dateRange, vendas_ano_valor]);
  const filteredSales = useMemo(() => {
    return Array.isArray(sales) ? sales : [];
  }, [sales]);
  const topProdutosIntervalo = useMemo(() => {
    const map = new Map<string, { nome: string; qtd: number; total: number }>();
    filteredSales.forEach(s => {
      (s.items || []).forEach((it: any) => {
        const nome = it.product?.name || it.product?.nome || String(it.product?.id || '');
        const unit = Number(it.product?.salePrice ?? it.product?.price ?? 0);
        const qtd = Number(it.quantity || 0);
        const total = unit * qtd;
        const curr = map.get(nome) || { nome, qtd: 0, total: 0 };
        curr.qtd += qtd;
        curr.total += total;
        map.set(nome, curr);
      });
    });
    return Array.from(map.values()).sort((a,b) => b.qtd - a.qtd).slice(0,5);
  }, [filteredSales]);
  const vendasData = useMemo(() => {
    return filteredSales.map((s: any) => {
      const itens = s.items || [];
      const bruto = itens.reduce((acc: number, it: any) => acc + (Number(it.product?.salePrice ?? it.product?.price ?? 0) * Number(it.quantity || 0)), 0);
      const desconto = itens.reduce((acc: number, it: any) => acc + Number(it.desconto_item || 0), 0);
      const liquido = Number(s.total ?? bruto - desconto);
      return { numero: s.numero ?? '', qtdItens: itens.length, bruto, desconto, liquido };
    });
  }, [filteredSales]);
  const presets = [
    { label: 'Hoje', dateRange: { from: new Date(), to: new Date() } },
    { label: 'Últimos 7 Dias', dateRange: { from: new Date(new Date().setDate(new Date().getDate() - 7)), to: new Date() } },
    { label: 'Últimos 30 Dias', dateRange: { from: new Date(new Date().setDate(new Date().getDate() - 30)), to: new Date() } },
    { label: 'Últimos 12 Meses', dateRange: { from: new Date(new Date().setMonth(new Date().getMonth() - 12)), to: new Date() } },
  ];

  const presetLabelLong = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 'Intervalo: não selecionado';
    const match = presets.find(p => p.dateRange.from && p.dateRange.to && p.dateRange.from?.toDateString() === dateRange.from.toDateString() && p.dateRange.to?.toDateString() === dateRange.to.toDateString());
    if (match) return `Intervalo: ${match.label}`;
    return `Intervalo: ${format(dateRange.from, 'dd/MM/yyyy')} até ${format(dateRange.to, 'dd/MM/yyyy')}`;
  }, [dateRange]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <button
          type="button"
          className="w-full sm:w-auto px-3 py-2 border rounded-md bg-white shadow-sm text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          onClick={async () => {
            const { value: sel } = await Swal.fire({
              title: 'Fechamento do Dia',
              input: 'date',
              inputValue: format((dateRange?.to ?? new Date()), 'yyyy-MM-dd'),
              confirmButtonText: 'Gerar PDF',
              cancelButtonText: 'Cancelar',
              showCancelButton: true,
            });
            if (sel) {
              window.open(`/relatorios/fechamento-dia?date=${sel}`, '_blank');
            }
          }}
        >
          <FileDown className="w-4 h-4" />
          <span className="truncate">Fechamento de Caixa</span>
        </button>

        <div className="flex items-center w-full sm:w-64">
          <span className="text-sm font-medium text-gray-700 mr-2">Período</span>
          <DateRangePicker className="w-full" presets={presets} value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500 lg:col-span-2">
          {isLoading ? (
            renderSkeletonCircleCard()
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 flex items-center gap-2"><DollarSign className="w-4 h-4" />Vendas (Líquidas)</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{formatCurrency(totalLiquidoIntervalo)}</p>
                <p className="text-xs text-gray-500 mt-1">{presetLabelLong}</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full border-4 border-green-300 flex items-center justify-center">
                  <span className="text-lg lg:text-xl font-bold text-gray-800">{vendasCountIntervalo}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Nº Total de Vendas</p>
              </div>
            </div>
          )}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500">
          {isLoading ? (
            renderSkeletonAmountCard()
          ) : (
            <div>
              <p className="text-sm text-gray-600">Bruto</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(totalBrutoIntervalo)}</p>
            </div>
          )}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-300">
          {isLoading ? (
            renderSkeletonAmountCard()
          ) : (
            <div>
              <p className="text-sm text-gray-600">Descontos</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalDescontoIntervalo)}</p>
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-xl shadow-md p-6 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">{chartLine.title}</h3>
          </div>
          <ChartContainer>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart accessibilityLayer data={chartLine.data} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="xLabel" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                <Line dataKey="valor" type="monotone" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} activeDot={{ r: 5 }}>
                  <LabelList
                    content={(props: any) => {
                      const { x, y, index } = props;
                      const point = chartLine.data[index];
                      const lbl = point?.label;
                      const val = point?.valor ?? 0;
                      if (!lbl || val <= 0) return null;
                      const safeY = Math.max((y ?? 0) - 12, 12);
                      return (
                        <text x={x} y={safeY} fontSize={12} fill="#111827" textAnchor="middle">
                          {lbl}
                        </text>
                      );
                    }}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white rounded-xl shadow-md p-6 col-span-1">
          {isLoading ? (
            renderSkeletonTableRows(5)
          ) : (
            <RelatorioTabela title="TOP 5 - PRODUTOS NO PERÍODO" data={topProdutosIntervalo} columns={[
              { header: 'Produto', accessorKey: 'nome' },
              { header: 'Qtd', accessorKey: 'qtd' },
              { header: 'Total', accessorKey: 'total', cell: ({ getValue }) => <span className="text-green-600 font-semibold">{formatCurrency(Number(getValue()||0))}</span> },
            ]} pageSize={5} />
          )}
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {(['vendas','produtos','categorias','formas'] as ListType[]).map(t => (
              <button key={t} onClick={() => setListType(t)} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${listType === t ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>{listTypeLabel(t)}</button>
            ))}
          </div>
          
        </div>
        {listType === 'formas' && (
          isLoading ? renderSkeletonTableRows(6) : (
            <RelatorioTabela title="Mix de Formas de Pagamento" data={Array.isArray(formasPagamentoMix) ? formasPagamentoMix : []} columns={[
              { header: 'Forma', accessorKey: 'nome' },
              { header: 'Vendas', accessorKey: 'vendas' },
              { header: 'Total', accessorKey: 'total', cell: ({ getValue }) => <span className="text-green-600 font-semibold">{formatCurrency(Number(getValue()||0))}</span> },
            ]} />
          )
        )}
        {/* {listType === 'pdv' && (
          <RelatorioTabela title="Vendas por PDV" items={Array.isArray(vendasPorPDV) ? vendasPorPDV : []} searchPlaceholder="Buscar PDV" renderRow={(item: any) => (
            <div className="grid grid-cols-[1fr_90px_120px] items-center gap-2"><span className="text-sm text-gray-700 truncate pr-2">{item.nome}</span><span className="text-sm font-semibold text-blue-600 text-right">{Number(item.num)}</span><span className="text-sm font-semibold text-green-600 text-right">{formatCurrency(item.total)}</span></div>
          )} />
        )} */}
        {/* {listType === 'vendedor' && (
          <RelatorioTabela title="Vendas por Vendedor" items={Array.isArray(vendasPorUsuario) ? vendasPorUsuario : []} searchPlaceholder="Buscar vendedor" renderRow={(item: any) => (
            <div className="grid grid-cols-[1fr_90px_120px] items-center gap-2"><span className="text-sm text-gray-700 truncate pr-2">{item.nome}</span><span className="text-sm font-semibold text-blue-600 text-right">{Number(item.num)}</span><span className="text-sm font-semibold text-green-600 text-right">{formatCurrency(item.total)}</span></div>
          )} />
        )} */}
        {/* {listType === 'clientes' && (
          <RelatorioTabela title="Top Clientes" items={Array.isArray(topClientes) ? topClientes : []} searchPlaceholder="Buscar cliente" renderRow={(item: any) => (
            <div className="grid grid-cols-[1fr_90px_120px] items-center gap-2"><span className="text-sm text-gray-700 truncate pr-2">{item.nome}</span><span className="text-sm font-semibold text-blue-600 text-right">{Number(item.num)}</span><span className="text-sm font-semibold text-green-600 text-right">{formatCurrency(item.total)}</span></div>
          )} />
        )} */}
        {listType === 'produtos' && (
          isLoading ? renderSkeletonTableRows(6) : (
            <RelatorioTabela title="Produtos Mais Vendidos" data={Array.isArray(produtosMaisVendidos) ? produtosMaisVendidos : []} columns={[
              { header: 'Produto', accessorKey: 'nome' },
              { header: 'Quantidade', accessorKey: 'total_itens_vendido', cell: ({ getValue }) => Math.round(Number(getValue() || 0)) },
              { header: 'Total', accessorKey: 'valor_total_itens_vendido', cell: ({ getValue }) => <span className="text-green-600 font-semibold">{formatCurrency(Number(getValue()||0))}</span> },
            ]} />
          )
        )}
        {listType === 'categorias' && (
          isLoading ? renderSkeletonTableRows(6) : (
            <RelatorioTabela title="Vendas por Categoria" data={Array.isArray(categoriasMaisVendidas) ? categoriasMaisVendidas : []} columns={[
              { header: 'Categoria', accessorKey: 'nome' },
              { header: 'Quantidade', accessorKey: 'total_itens_vendido', cell: ({ getValue }) => Math.round(Number(getValue() || 0)) },
              { header: 'Total', accessorKey: 'valor_total_itens_vendido', cell: ({ getValue }) => <span className="text-green-600 font-semibold">{formatCurrency(Number(getValue()||0))}</span> },
            ]} />
          )
        )}
        {listType === 'vendas' && (
          isLoading ? renderSkeletonSalesRows(8) : (
            <RelatorioTabela title="Vendas" data={vendasData} columns={[
              { header: 'Nº Venda', accessorKey: 'numero' },
              { header: 'Itens', accessorKey: 'qtdItens' },
              { header: 'Valor Bruto', accessorKey: 'bruto', meta: { headerClassName: 'hidden sm:table-cell', cellClassName: 'hidden sm:table-cell' }, cell: ({ getValue }) => formatCurrency(Number(getValue()||0)) },
              { header: 'Valor Desconto', accessorKey: 'desconto', meta: { headerClassName: 'hidden sm:table-cell', cellClassName: 'hidden sm:table-cell' }, cell: ({ getValue }) => formatCurrency(Number(getValue()||0)) },
              { header: 'Valor Líquido', accessorKey: 'liquido', cell: ({ getValue }) => <span className="text-green-600 font-semibold">{formatCurrency(Number(getValue()||0))}</span> },
            ]} />
          )
        )}
       
        
      </motion.div>
    </div>
  );
};

export default RelatoriosView;
