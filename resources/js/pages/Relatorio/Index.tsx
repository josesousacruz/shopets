import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import RelatoriosView from '@/components/views/RelatoriosView';
import { Sale } from '@/types';

interface RelatorioIndexProps {
    sales: Sale[];
    vendas_hoje_valor: number;
    vendas_mes_valor: number;
    vendas_hoje_numero: number;
    vendas_ano_valor: Record<string, Record<string, number | null>>;
    produtosAtivos: number;
    produtosMaisVendidos: Record<string, number>;
    categoriasMaisVendidas: Record<string, number>;
    formasPagamentoMix: { nome: string; vendas: number; total: number; }[];
    percentualParceladas: number;
    statusPagamentos: { status_pagamento: string; qtd: number; total: number; }[];
    vendasPorPDV: { nome: string; num: number; total: number; }[];
    vendasPorUsuario: { nome: string; num: number; total: number; }[];
    topClientes: { nome: string; num: number; total: number; }[];
    estoqueBaixo: { nome: string; estoque_atual: number; estoque_minimo: number; }[];
    entradasEstoqueUlt30: { dia: string; total: number; }[];
    fluxoSaldo30: number;
    contasResumo: { pagar: { pendente: number; vencido: number; pago: number }; receber: { pendente: number; vencido: number; recebido: number } };
    totalLiquidoIntervalo: number;
    vendasCountIntervalo: number;
    totalBrutoIntervalo: number;
    totalDescontoIntervalo: number;
}

export default function Index({ sales, vendas_hoje_valor, vendas_mes_valor, vendas_hoje_numero, vendas_ano_valor, produtosAtivos, produtosMaisVendidos, categoriasMaisVendidas, formasPagamentoMix, percentualParceladas, statusPagamentos, vendasPorPDV, vendasPorUsuario, topClientes, estoqueBaixo, entradasEstoqueUlt30, fluxoSaldo30, contasResumo, totalLiquidoIntervalo, vendasCountIntervalo, totalBrutoIntervalo, totalDescontoIntervalo }: RelatorioIndexProps) {  
     console.log("vendas_ano_valor", vendas_ano_valor);
     console.log("produtosMaisVendidos", produtosMaisVendidos);
     console.log("categoriasMaisVendidas", categoriasMaisVendidas);
    return (
        <AuthenticatedLayout currentView="relatorios">
            <RelatoriosView
                sales={sales}
                vendas_hoje_valor={vendas_hoje_valor}
                vendas_mes_valor={vendas_mes_valor}
                vendas_hoje_numero={vendas_hoje_numero}
                vendas_ano_valor={vendas_ano_valor}
                produtosAtivos={produtosAtivos}
                produtosMaisVendidos={produtosMaisVendidos}
                categoriasMaisVendidas={categoriasMaisVendidas}
                formasPagamentoMix={formasPagamentoMix}
                percentualParceladas={percentualParceladas}
                statusPagamentos={statusPagamentos}
                vendasPorPDV={vendasPorPDV}
                vendasPorUsuario={vendasPorUsuario}
                topClientes={topClientes}
                estoqueBaixo={estoqueBaixo}
                entradasEstoqueUlt30={entradasEstoqueUlt30}
                fluxoSaldo30={fluxoSaldo30}
                contasResumo={contasResumo}
                totalLiquidoIntervalo={totalLiquidoIntervalo}
                vendasCountIntervalo={vendasCountIntervalo}
                totalBrutoIntervalo={totalBrutoIntervalo}
                totalDescontoIntervalo={totalDescontoIntervalo}
            />
        </AuthenticatedLayout>
    );
}