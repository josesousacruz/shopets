import React from 'react';
import { Link, router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { ArrowLeft, Package, Truck, CheckCircle, XCircle, Clock, FileText, CreditCard } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { StatusChip } from './Index';

interface Item { nome: string; sku: string | null; preco_unit: number; quantidade: number; subtotal: number; }
interface Evento { tipo: string; descricao: string; criado_em: string | null; }

interface Pedido {
    numero: string;
    status: string;
    modalidade: string;
    subtotal: number;
    frete: number;
    desconto: number;
    total: number;
    frete_servico: string | null;
    prazo_entrega_dias: number | null;
    codigo_rastreio: string | null;
    observacoes: string | null;
    criado_em: string | null;
    pago_em: string | null;
    enviado_em: string | null;
    entregue_em: string | null;
    cancelado_em: string | null;
    nfe_numero: string | null;
    nfe_chave: string | null;
    cliente: { nome: string; email: string | null; telefone: string | null; cpf_cnpj: string | null } | null;
    endereco: { logradouro: string; numero: string; complemento: string | null; bairro: string; cidade: string; uf: string; cep: string } | null;
    itens: Item[];
    pagamento: { metodo: string; status: string; valor: number; gateway: string | null; processado_em: string | null } | null;
    venda: { numero: string } | null;
    eventos: Evento[];
}

function formatBRL(v: number): string {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatData(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
    } catch { return '—'; }
}

export default function Show({ pedido }: { pedido: Pedido }) {
    const base = `/admin/loja/pedidos/${encodeURIComponent(pedido.numero)}`;

    const reload = (msg: string) => ({
        preserveScroll: true,
        onSuccess: () => Swal.fire({ title: 'Pronto!', text: msg, icon: 'success', timer: 1800, showConfirmButton: false }),
        onError: (errors: Record<string, string>) => Swal.fire({ title: 'Erro', text: Object.values(errors)[0] ?? 'Não foi possível concluir.', icon: 'error' }),
    });

    const separar = () => router.put(`${base}/separacao`, {}, reload('Pedido em separação.'));
    const entregar = () => router.put(`${base}/entregar`, {}, reload('Pedido entregue.'));

    const enviar = async () => {
        const { value: codigo, isConfirmed } = await Swal.fire({
            title: 'Marcar como enviado',
            input: 'text',
            inputLabel: 'Código de rastreio (opcional)',
            inputPlaceholder: 'BR123456789BR',
            showCancelButton: true,
            confirmButtonText: 'Enviar',
            cancelButtonText: 'Cancelar',
        });
        if (!isConfirmed) return;
        router.put(`${base}/enviar`, { codigo_rastreio: codigo || null }, reload('Pedido marcado como enviado.'));
    };

    const cancelar = async () => {
        const { value: motivo, isConfirmed } = await Swal.fire({
            title: 'Cancelar pedido?',
            input: 'text',
            inputLabel: 'Motivo (opcional)',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sim, cancelar',
            cancelButtonText: 'Voltar',
        });
        if (!isConfirmed) return;
        router.put(`${base}/cancelar`, { motivo: motivo || null }, reload('Pedido cancelado.'));
    };

    const podeSeparar = pedido.status === 'pago';
    const podeEnviar = pedido.status === 'em_separacao';
    const podeEntregar = pedido.status === 'enviado';
    const podeCancelar = ['aguardando_pagamento', 'pago', 'em_separacao'].includes(pedido.status);

    const end = pedido.endereco;

    return (
        <AuthenticatedLayout currentView="loja">
            <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <Link href="/admin/loja/pedidos" className="text-sm text-gray-500 hover:text-cyan-600 inline-flex items-center gap-1 mb-1">
                            <ArrowLeft className="w-4 h-4" /> Voltar aos pedidos
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Package className="w-7 h-7 text-cyan-600" /> Pedido {pedido.numero}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Criado em {formatData(pedido.criado_em)}</p>
                    </div>
                    <StatusChip status={pedido.status} />
                </div>

                {/* Ações */}
                <div className="flex flex-wrap gap-3">
                    {podeSeparar && (
                        <button onClick={separar} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-blue-700 transition">
                            <Package className="w-4 h-4" /> Em separação
                        </button>
                    )}
                    {podeEnviar && (
                        <button onClick={enviar} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-indigo-700 transition">
                            <Truck className="w-4 h-4" /> Marcar enviado
                        </button>
                    )}
                    {podeEntregar && (
                        <button onClick={entregar} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-green-700 transition">
                            <CheckCircle className="w-4 h-4" /> Marcar entregue
                        </button>
                    )}
                    {podeCancelar && (
                        <button onClick={cancelar} className="px-4 py-2 rounded-lg bg-white border border-rose-200 text-rose-600 text-sm font-semibold inline-flex items-center gap-2 hover:bg-rose-50 transition">
                            <XCircle className="w-4 h-4" /> Cancelar
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Coluna principal */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Itens */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h2 className="font-semibold text-gray-900 mb-4">Itens</h2>
                            <div className="divide-y divide-gray-100">
                                {pedido.itens.map((it, i) => (
                                    <div key={i} className="flex items-center justify-between py-3">
                                        <div>
                                            <div className="text-gray-900 font-medium">{it.nome}</div>
                                            <div className="text-xs text-gray-400">
                                                {it.sku ? `SKU ${it.sku} · ` : ''}{it.quantidade} × {formatBRL(it.preco_unit)}
                                            </div>
                                        </div>
                                        <div className="font-semibold text-gray-900">{formatBRL(it.subtotal)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-cyan-600" /> Histórico
                            </h2>
                            {pedido.eventos.length === 0 ? (
                                <p className="text-sm text-gray-400">Sem eventos registrados.</p>
                            ) : (
                                <ul className="space-y-4">
                                    {pedido.eventos.map((e, i) => (
                                        <li key={i} className="flex gap-3">
                                            <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-cyan-500 flex-shrink-0" />
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{e.descricao || e.tipo}</div>
                                                <div className="text-xs text-gray-400">{formatData(e.criado_em)}</div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Endereço */}
                        {end && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <h2 className="font-semibold text-gray-900 mb-3">Endereço de entrega</h2>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    {end.logradouro}, {end.numero}{end.complemento ? ` — ${end.complemento}` : ''}<br />
                                    {end.bairro} — {end.cidade}/{end.uf}<br />
                                    CEP {end.cep}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Coluna lateral */}
                    <div className="space-y-6">
                        {/* Cliente */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h2 className="font-semibold text-gray-900 mb-3">Cliente</h2>
                            {pedido.cliente ? (
                                <div className="text-sm text-gray-600 space-y-1">
                                    <div className="text-gray-900 font-medium">{pedido.cliente.nome}</div>
                                    {pedido.cliente.email && <div>{pedido.cliente.email}</div>}
                                    {pedido.cliente.telefone && <div>{pedido.cliente.telefone}</div>}
                                    {pedido.cliente.cpf_cnpj && <div>{pedido.cliente.cpf_cnpj}</div>}
                                </div>
                            ) : <p className="text-sm text-gray-400">—</p>}
                        </div>

                        {/* Resumo */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h2 className="font-semibold text-gray-900 mb-3">Resumo</h2>
                            <div className="text-sm space-y-2">
                                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatBRL(pedido.subtotal)}</span></div>
                                <div className="flex justify-between text-gray-600"><span>Frete{pedido.frete_servico ? ` (${pedido.frete_servico})` : ''}</span><span>{formatBRL(pedido.frete)}</span></div>
                                {pedido.desconto > 0 && <div className="flex justify-between text-gray-600"><span>Desconto</span><span>-{formatBRL(pedido.desconto)}</span></div>}
                                <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100"><span>Total</span><span>{formatBRL(pedido.total)}</span></div>
                            </div>
                            {pedido.codigo_rastreio && (
                                <div className="mt-3 text-xs text-gray-500">Rastreio: <span className="font-semibold text-gray-700">{pedido.codigo_rastreio}</span></div>
                            )}
                        </div>

                        {/* Pagamento */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><CreditCard className="w-5 h-5 text-cyan-600" /> Pagamento</h2>
                            {pedido.pagamento ? (
                                <div className="text-sm text-gray-600 space-y-1">
                                    <div className="capitalize">{pedido.pagamento.metodo} · {pedido.pagamento.status}</div>
                                    <div>{formatBRL(pedido.pagamento.valor)}</div>
                                    {pedido.pagamento.processado_em && <div className="text-xs text-gray-400">Em {formatData(pedido.pagamento.processado_em)}</div>}
                                </div>
                            ) : <p className="text-sm text-gray-400">Sem pagamento registrado.</p>}
                        </div>

                        {/* Venda / NF-e */}
                        {(pedido.venda || pedido.nfe_numero) && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><FileText className="w-5 h-5 text-cyan-600" /> Fiscal</h2>
                                <div className="text-sm text-gray-600 space-y-1">
                                    {pedido.venda && <div>Venda: <span className="font-semibold text-gray-800">{pedido.venda.numero}</span></div>}
                                    {pedido.nfe_numero ? <div>NF-e: <span className="font-semibold text-gray-800">{pedido.nfe_numero}</span></div> : <div className="text-gray-400">NF-e não emitida.</div>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
