import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import FinalizarVendaModal from './FinalizarVendaModal';
import { X, Loader2, Plus, Minus, Trash2, ShoppingCart, Search as SearchIcon, CheckCircle2, Undo2, Package, ArrowLeftRight } from 'lucide-react';
import Swal from 'sweetalert2';

interface ItemRow {
  id_item: number;
  id_produto: number;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  valor_total_item: number;
}

interface DevolucaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  idVenda: number | null;
  onConcluido?: (novaVendaId: number | null) => void;
}

export default function DevolucaoModal({ isOpen, onClose, idVenda, onConcluido }: DevolucaoModalProps) {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [processing, setProcessing] = useState(false);
  const [formas, setFormas] = useState<{ id_forma_pagamento: number; nome: string }[]>([]);
  const [formaSelecionada, setFormaSelecionada] = useState<number | null>(null);
  const [valorOriginalTotal, setValorOriginalTotal] = useState<number>(0);
  const [isTrocaOpen, setIsTrocaOpen] = useState<boolean>(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [busca, setBusca] = useState<string>('');
  const [novosItens, setNovosItens] = useState<{ id_produto: number; quantidade: number; preco_unitario: number }[]>([]);
  const [isPagamentoModalOpen, setIsPagamentoModalOpen] = useState<boolean>(false);
  const itensRestantes = useMemo(() => items.filter(i => !selected[i.id_item]), [items, selected]);
  const [addedMap, setAddedMap] = useState<Record<number, boolean>>({});
  const apiBase = typeof window !== 'undefined' ? window.location.origin : '';
  const selectedIds = useMemo(() => Object.keys(selected).filter(id => selected[Number(id)]).map(Number), [selected]);
  const [processingConfirmarTroca, setProcessingConfirmarTroca] = useState(false);
  const atualizarQuantidadeNovoItem = (idx: number, novoQ: number) => {
    setNovosItens(prev => {
      const arr = [...prev];
      const p = produtos.find((pp: any) => Number(pp.id) === Number(arr[idx].id_produto));
      const stock = Number(p?.stock || 0);
      const q = Math.min(Math.max(1, Math.floor(novoQ)), stock > 0 ? stock : 1);
      arr[idx] = { ...arr[idx], quantidade: q };
      return arr;
    });
  };
  const removerNovoItem = (idx: number) => {
    setNovosItens(prev => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    if (!isOpen || !idVenda) return;
    setLoading(true);
    fetch(`${apiBase}/vendas/${idVenda}/itens`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        const arr = json.items || [];
        setItems(arr);
        const initSel: Record<number, boolean> = {};
        arr.forEach((i: ItemRow) => { initSel[i.id_item] = false; });
        setSelected(initSel);
        const vt = json?.venda?.valor_total ? Number(json.venda.valor_total) : 0;
        setValorOriginalTotal(vt);
      })
      .finally(() => setLoading(false));
  }, [isOpen, idVenda]);

  useEffect(() => {
    fetch(`${apiBase}/formas-pagamento/ativas`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        const arr = json.formas_pagamento || [];
        setFormas(arr);
        setFormaSelecionada(arr.length > 0 ? arr[0].id_forma_pagamento : null);
      });
  }, []);

  const totalDevolver = useMemo(() => {
    return items.reduce((sum, i) => sum + (selected[i.id_item] ? i.valor_total_item : 0), 0);
  }, [items, selected]);

  const toggleItem = (id: number) => {
    setSelected(s => ({ ...s, [id]: !s[id] }));
  };

  

  const confirmarDevolucaoSemTroca = async () => {
    const ids = Object.keys(selected).filter(id => selected[Number(id)]).map(Number);
    if (ids.length === 0) return;
    setProcessing(true);
    try {
      const resp = await axios.post(`${apiBase}/vendas/${idVenda}/devolucao/finalizar`, {
        itens_devolver: ids,
      });
      const valorRestituir = Number(resp.data?.valor_restituir || 0);
      if (valorRestituir > 0) {
        await Swal.fire({
          title: 'Restituição',
          text: `Valor a restituir: ${formatCurrency(valorRestituir)}`,
          icon: 'info',
          confirmButtonText: 'Fechar'
        });
      }
      onConcluido && onConcluido(resp.data?.nova_venda?.id_venda || null);
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Devolução</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {(
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left">Produto</th>
                      <th className="px-3 py-2 text-left">Qtd</th>
                      <th className="px-3 py-2 text-left">Total</th>
                      <th className="px-3 py-2 text-left">Selecionar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (<tr><td className="px-3 py-2" colSpan={4}>Carregando...</td></tr>)}
                    {!loading && items.length === 0 && (<tr><td className="px-3 py-2" colSpan={4}>Sem itens</td></tr>)}
                    {items.map(i => (
                      <tr key={i.id_item} className="border-b">
                        <td className="px-3 py-2">{i.produto_nome}</td>
                        <td className="px-3 py-2">{i.quantidade}</td>
                        <td className="px-3 py-2">{formatCurrency(i.valor_total_item)}</td>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={!!selected[i.id_item]} onChange={() => toggleItem(i.id_item)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total a devolver: {formatCurrency(totalDevolver)}</span>
                <div className="flex gap-2">
                  <button
                    disabled={processing}
                    onClick={async () => {
                      if (selectedIds.length === 0) {
                        await Swal.fire({ title: 'Selecione itens', text: 'Marque ao menos um item para devolver antes de trocar.', icon: 'warning', confirmButtonText: 'OK' });
                        return;
                      }
                      setProcessing(true);
                      setIsTrocaOpen(true);
                      try {
                        const { data } = await axios.get(`${apiBase}/pdv/products`);
                        setProdutos(data.products || []);
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setProcessing(false);
                      }
                    }}
                    className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    {processing ? (<span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Processando...</span>) : (<span className="flex items-center gap-2"><ArrowLeftRight size={16} /> Trocar Produto</span>)}
                  </button>
                  <button disabled={processing || selectedIds.length === 0} onClick={confirmarDevolucaoSemTroca} className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700">{processing ? (<span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Processando...</span>) : (<span className="flex items-center gap-2"><Undo2 size={16} /> Confirmar Devolução</span>)}</button>
                </div>
              </div>
              {selectedIds.length === 0 && (
                <div className="text-xs text-red-600">Selecione pelo menos um item para continuar.</div>
              )}
            </>
          )}
        </div>
        {isTrocaOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h4 className="text-md font-semibold">Selecionar produtos para troca</h4>
                <button className="p-2" onClick={() => setIsTrocaOpen(false)}><X size={16} /></button>
              </div>
              <div className="grid grid-cols-3 gap-0 h-[calc(90vh-60px)]">
                <div className="col-span-2 p-4 overflow-y-auto">
                  <div className="mb-3">
                    <div className="relative">
                      <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar produtos" className="pl-7 border rounded px-3 py-2 w-full mb-3 bg-gray-50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {produtos
                      .filter((p: any) => ((p.name || '').toLowerCase().includes((busca || '').toLowerCase())))
                      .filter((p: any) => Number(p.stock || 0) > 0)
                      .map((p: any) => (
                        <div key={p.id} className="border rounded p-2 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{p.name}</div>
                            <div className="text-xs text-gray-600">{formatCurrency(Number(p.price || 0))} · estoque: {Number(p.stock || 0)}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="number" min={1} max={Number(p.stock || 1)} step={1} defaultValue={1} className="border rounded px-2 py-1 w-24" id={`q_${p.id}`} />
                            <button
                              className={`px-2 py-1 rounded ${addedMap[p.id] ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}
                              disabled={!!addedMap[p.id]}
                              onClick={() => {
                                const qEl = document.getElementById(`q_${p.id}`) as HTMLInputElement;
                                let q = Math.floor(Number(qEl?.value || 1));
                                const stock = Number(p.stock || 0);
                                if (q > stock) q = stock;
                                if (q < 1) q = 1;
                                const novo = { id_produto: Number(p.id), quantidade: q, preco_unitario: Number(p.price || 0) };
                                setNovosItens((prev) => [...prev, novo]);
                                setAddedMap((prev) => ({ ...prev, [p.id]: true }));
                                setTimeout(() => setAddedMap((prev) => { const n = { ...prev }; delete n[p.id]; return n; }), 1200);
                              }}>{addedMap[p.id] ? 'Adicionado' : (<span className="flex items-center gap-1"><Plus size={14} /> Adicionar</span>)}</button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="col-span-1 border-l p-4 overflow-y-auto bg-gray-50">
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium"><ShoppingCart size={16} /> Carrinho</div>
                  <div className="space-y-2">
                    {itensRestantes.map((i) => (
                      <div key={`rest-${i.id_item}`} className="bg-white border rounded-lg shadow-sm p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center"><Package size={16} className="text-gray-500" /></div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{i.produto_nome}</div>
                            <div className="text-xs text-green-700 font-semibold">{formatCurrency(Number(i.valor_total_item || 0))}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="px-2 py-1 bg-gray-200 text-gray-600 rounded" disabled><Minus size={14} /></button>
                            <span className="text-sm">{Math.round(Number(i.quantidade || 1))}</span>
                            <button className="px-2 py-1 bg-gray-200 text-gray-600 rounded" disabled><Plus size={14} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {novosItens.map((it, idx) => {
                      const prod = produtos.find((p: any) => Number(p.id) === Number(it.id_produto));
                      const nome = prod?.name || `Produto ${it.id_produto}`;
                      const subtotal = Number(it.preco_unitario) * Number(it.quantidade);
                      const stock = Number(prod?.stock || 0);
                      return (
                        <div key={`add-${it.id_produto}-${idx}`} className="bg-white border rounded-lg shadow-sm p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center"><Package size={16} className="text-gray-500" /></div>
                            <div className="flex-1">
                              <div className="text-sm font-medium">{nome}</div>
                              <div className="text-xs text-green-700 font-semibold">{formatCurrency(subtotal)}</div>
                              <div className="text-[11px] text-gray-500">Estoque: {stock}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button className="px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300" onClick={() => atualizarQuantidadeNovoItem(idx, Math.max(1, it.quantidade - 1))}><Minus size={14} /></button>
                              <span className="text-sm w-6 text-center">{Math.round(Number(it.quantidade || 1))}</span>
                              <button className="px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300" onClick={() => atualizarQuantidadeNovoItem(idx, it.quantidade + 1)}><Plus size={14} /></button>
                              <button className="ml-2 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700" onClick={() => removerNovoItem(idx)}><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 border-t pt-3 text-sm">
                    {(() => {
                      const baseRestantes = itensRestantes.reduce((s, i) => s + Number(i.valor_total_item || 0), 0);
                      const addTotal = novosItens.reduce((s, it) => s + (Number(it.preco_unitario) * Number(it.quantidade)), 0);
                      const estimado = baseRestantes + addTotal;
                      const diferenca = estimado - valorOriginalTotal;
                      return (
                        <div className="space-y-1">
                          <div>Total itens restantes: {formatCurrency(baseRestantes)}</div>
                          <div>Total adicionados: {formatCurrency(addTotal)}</div>
                          <div className="font-medium">Total novo: {formatCurrency(estimado)}</div>
                          <div className={`font-semibold ${diferenca > 0 ? 'text-red-600' : (diferenca < 0 ? 'text-green-600' : 'text-gray-800')}`}>
                            {diferenca >= 0 ? 'Diferença a pagar:' : 'Valor a restituir:'} {formatCurrency(Math.abs(diferenca))}
                          </div>
                          <div className="pt-2 flex gap-2">
                            <button className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300" onClick={() => { setNovosItens([]); }}><Trash2 size={16} className="inline mr-1" /> Limpar</button>
                            <button className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700" onClick={() => {
                              const baseRestantes2 = itensRestantes.reduce((s, i) => s + Number(i.valor_total_item || 0), 0);
                              const addTotal2 = novosItens.reduce((s, it) => s + (Number(it.preco_unitario) * Number(it.quantidade)), 0);
                              const estimado2 = baseRestantes2 + addTotal2;
                              const dif2 = estimado2 - valorOriginalTotal;
                              if (dif2 > 0) {
                                setIsPagamentoModalOpen(true);
                              } else {
                                setProcessingConfirmarTroca(true);
                                axios.post(`${apiBase}/vendas/${idVenda}/devolucao/finalizar`, {
                                  itens_devolver: Object.keys(selected).filter(id => selected[Number(id)]).map(Number),
                                  novos_itens: novosItens,
                                }).then((resp) => {
                                  const vr = Number(resp.data?.valor_restituir || 0);
                                  if (vr > 0) {
                                    Swal.fire({ title: 'Restituição', text: `Valor a restituir: ${formatCurrency(vr)}`, icon: 'info', confirmButtonText: 'Fechar' });
                                  }
                                  setIsTrocaOpen(false);
                                  onConcluido && onConcluido(resp.data?.nova_venda?.id_venda || null);
                                  onClose();
                                }).catch((e) => console.error(e)).finally(() => setProcessingConfirmarTroca(false));
                              }
                            }}><CheckCircle2 size={16} className="inline mr-1" /> {processingConfirmarTroca ? (<span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Processando...</span>) : 'Confirmar Troca'}</button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {isPagamentoModalOpen && (
          <FinalizarVendaModal
            isOpen={isPagamentoModalOpen}
            onClose={() => setIsPagamentoModalOpen(false)}
            onCancel={() => setIsPagamentoModalOpen(false)}
            onConfirm={async (dados) => {
              try {
                await axios.post(`${apiBase}/vendas/${idVenda}/devolucao/finalizar`, {
                  itens_devolver: Object.keys(selected).filter(id => selected[Number(id)]).map(Number),
                  novos_itens: novosItens,
                  pagamentos: dados.pagamentos,
                  observacoes: dados.observacoes,
                });
                await Swal.fire({ title: 'Troca concluída', text: 'Pagamento registrado e troca finalizada.', icon: 'success', confirmButtonText: 'Fechar' });
                setIsPagamentoModalOpen(false);
                setIsTrocaOpen(false);
                onConcluido && onConcluido(null);
                onClose();
              } catch (e) {
                console.error(e);
              }
            }}
            clientes={[]}
            formasPagamento={formas.map(f => ({ id_forma_pagamento: f.id_forma_pagamento, nome: f.nome, tipo: 'dinheiro', permite_parcelamento: false })) as any}
            valorTotal={Math.max(0, (itensRestantes.reduce((s, i) => s + Number(i.valor_total_item || 0), 0) + novosItens.reduce((s, it) => s + (Number(it.preco_unitario) * Number(it.quantidade)), 0)) - valorOriginalTotal)}
          />
        )}
      </div>
    </div>
  );
}
