import React, { useEffect, useState } from 'react';
import { Eye, Undo2 } from 'lucide-react';
import { X } from 'lucide-react';
import RelatorioTabela from '../relatorio/RelatorioTabela';

interface VendaRow {
  id_venda: number;
  numero_venda: string;
  valor_liquido: number;
  status: string;
}

interface HistoricoVendasModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  onDetalhes: (id_venda: number) => void;
  onDevolucao: (id_venda: number) => void;
}

export default function HistoricoVendasModal({ isOpen, onClose, productId, onDetalhes, onDevolucao }: HistoricoVendasModalProps) {
  const [data, setData] = useState<VendaRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`/estoque/produto/${productId}/vendas`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => setData(json.vendas || []))
      .finally(() => setLoading(false));
  }, [isOpen, productId]);

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  const formatDate = (d: string | null | undefined) => {
    try {
      if (!d) return '-';
      const dt = new Date(d);
      return dt.toLocaleString('pt-BR');
    } catch { return String(d || '-'); }
  };
  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, string> = {
      finalizada: 'bg-green-100 text-green-700',
      aberta: 'bg-blue-100 text-blue-700',
      cancelada: 'bg-red-100 text-red-700',
      devolvida: 'bg-yellow-100 text-yellow-800',
    };
    const cls = map[(status || '').toLowerCase()] || 'bg-gray-100 text-gray-700';
    return <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>{status}</span>;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Histórico de Vendas</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          <RelatorioTabela<VendaRow>
            title=""
            data={loading ? [] : data}
            pageSize={10}
            columns={[
              { header: 'Número da Venda', accessorKey: 'numero_venda' },
              { header: 'Data', accessorKey: 'data_venda', cell: ({ getValue }) => formatDate(getValue() as any) },
              { header: 'Valor Líquido', accessorKey: 'valor_liquido', cell: ({ getValue }) => formatCurrency(Number(getValue() || 0)) },
              { header: 'Status', accessorKey: 'status', cell: ({ getValue }) => <StatusBadge status={String(getValue() || '')} /> },
              {
                header: 'Ações',
                accessorKey: 'id_venda',
                cell: ({ row }) => (
                  <div className="flex gap-2">
                    <button className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => onDetalhes(row.original.id_venda)}><Eye size={14} className="inline mr-1"/> Detalhes</button>
                    {row.original.status === 'finalizada' && (
                      <button className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700" onClick={() => onDevolucao(row.original.id_venda)}><Undo2 size={14} className="inline mr-1"/> Devolução</button>
                    )}
                  </div>
                )
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
