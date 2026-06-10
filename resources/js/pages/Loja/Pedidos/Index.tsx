import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { Search, Package, ChevronRight } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';

interface PedidoRow {
    numero: string;
    cliente: string;
    cliente_email: string | null;
    data: string | null;
    modalidade: string;
    total: number;
    status: string;
    itens_count: number;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    pedidos: Paginated<PedidoRow>;
    filtros: { status: string | null; busca: string };
    statusOptions: string[];
}

const STATUS_LABEL: Record<string, string> = {
    aguardando_pagamento: 'Aguardando pagamento',
    pago: 'Pago',
    em_separacao: 'Em separação',
    enviado: 'Enviado',
    entregue: 'Entregue',
    cancelado: 'Cancelado',
};

const STATUS_CHIP: Record<string, string> = {
    aguardando_pagamento: 'bg-amber-100 text-amber-700 border-amber-200',
    pago: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    em_separacao: 'bg-blue-100 text-blue-700 border-blue-200',
    enviado: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    entregue: 'bg-green-100 text-green-700 border-green-200',
    cancelado: 'bg-rose-100 text-rose-700 border-rose-200',
};

function formatBRL(v: number): string {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
    } catch {
        return '—';
    }
}

export function StatusChip({ status }: { status: string }) {
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_CHIP[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {STATUS_LABEL[status] ?? status}
        </span>
    );
}

export default function Index({ pedidos, filtros, statusOptions }: Props) {
    const [busca, setBusca] = useState(filtros.busca ?? '');
    const [status, setStatus] = useState(filtros.status ?? '');

    const aplicar = (e?: React.FormEvent) => {
        e?.preventDefault();
        router.get('/admin/loja/pedidos', { busca: busca || undefined, status: status || undefined }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <AuthenticatedLayout currentView="loja">
            <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Package className="w-7 h-7 text-cyan-600" /> Pedidos da Loja
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">{pedidos.total} pedido(s) no total.</p>
                    </div>
                </div>

                {/* Filtros */}
                <form onSubmit={aplicar} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[220px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Buscar</label>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                placeholder="Número, cliente ou e-mail"
                                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                    </div>
                    <div className="min-w-[180px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="">Todos</option>
                            {statusOptions.map((s) => (
                                <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" className="px-5 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-sm font-semibold shadow hover:opacity-90 transition">
                        Filtrar
                    </button>
                </form>

                {/* Tabela */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                                    <th className="text-left font-semibold px-4 py-3">Número</th>
                                    <th className="text-left font-semibold px-4 py-3">Cliente</th>
                                    <th className="text-left font-semibold px-4 py-3">Data</th>
                                    <th className="text-left font-semibold px-4 py-3">Modalidade</th>
                                    <th className="text-right font-semibold px-4 py-3">Total</th>
                                    <th className="text-left font-semibold px-4 py-3">Status</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pedidos.data.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-gray-400">Nenhum pedido encontrado.</td>
                                    </tr>
                                )}
                                {pedidos.data.map((p) => (
                                    <tr
                                        key={p.numero}
                                        className="hover:bg-cyan-50/40 cursor-pointer transition"
                                        onClick={() => router.get(`/admin/loja/pedidos/${encodeURIComponent(p.numero)}`)}
                                    >
                                        <td className="px-4 py-3 font-semibold text-gray-900">{p.numero}</td>
                                        <td className="px-4 py-3">
                                            <div className="text-gray-900">{p.cliente}</div>
                                            {p.cliente_email && <div className="text-xs text-gray-400">{p.cliente_email}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{formatData(p.data)}</td>
                                        <td className="px-4 py-3 text-gray-600 capitalize">{p.modalidade}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatBRL(p.total)}</td>
                                        <td className="px-4 py-3"><StatusChip status={p.status} /></td>
                                        <td className="px-4 py-3 text-right">
                                            <ChevronRight className="w-4 h-4 text-gray-300 inline" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginação */}
                    {pedidos.last_page > 1 && (
                        <div className="flex items-center justify-center gap-1 p-4 border-t border-gray-100">
                            {pedidos.links.map((l, i) => (
                                <button
                                    key={i}
                                    disabled={!l.url}
                                    onClick={() => l.url && router.get(l.url, {}, { preserveScroll: true, preserveState: true })}
                                    className={`px-3 py-1.5 rounded-lg text-sm transition ${
                                        l.active ? 'bg-cyan-600 text-white' : l.url ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-default'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
