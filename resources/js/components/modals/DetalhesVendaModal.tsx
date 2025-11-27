import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ItemRow {
  id_item: number;
  id_produto: number;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  desconto_item?: number;
  valor_total_item: number;
}

interface DetalhesVendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  idVenda: number | null;
}

export default function DetalhesVendaModal({ isOpen, onClose, idVenda }: DetalhesVendaModalProps) {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [vendaInfo, setVendaInfo] = useState<{ numero_venda: string; valor_total: number } | null>(null);

  useEffect(() => {
    if (!isOpen || !idVenda) return;
    setLoading(true);
    fetch(`/vendas/${idVenda}/itens`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        setItems(json.items || []);
        setVendaInfo(json.venda ? { numero_venda: json.venda.numero_venda, valor_total: json.venda.valor_total } : null);
      })
      .finally(() => setLoading(false));
  }, [isOpen, idVenda]);

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">Itens da Venda</h3>
            {vendaInfo && <p className="text-sm text-gray-500">#{vendaInfo.numero_venda} • {formatCurrency(vendaInfo.valor_total)}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left">Produto</th>
                  <th className="px-3 py-2 text-left">Qtd</th>
                  <th className="px-3 py-2 text-left">Preço</th>
                  <th className="px-3 py-2 text-left">Total</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td className="px-3 py-2" colSpan={4}>Carregando...</td></tr>
                )}
                {!loading && items.length === 0 && (
                  <tr><td className="px-3 py-2" colSpan={4}>Sem itens</td></tr>
                )}
                {items.map(item => (
                  <tr key={item.id_item} className="border-b">
                    <td className="px-3 py-2">{item.produto_nome}</td>
                    <td className="px-3 py-2">{item.quantidade}</td>
                    <td className="px-3 py-2">{formatCurrency(item.preco_unitario)}</td>
                    <td className="px-3 py-2">{formatCurrency(item.valor_total_item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

