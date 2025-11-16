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
}

export default function Index({ sales, vendas_hoje_valor, vendas_mes_valor, vendas_hoje_numero, vendas_ano_valor, produtosAtivos, produtosMaisVendidos }: RelatorioIndexProps) {  
     console.log("vendas_ano_valor", vendas_ano_valor);
     console.log("produtosMaisVendidos", produtosMaisVendidos);
    return (
        <AuthenticatedLayout currentView="relatorios">
            <RelatoriosView
                sales={sales}
                vendas_hoje_valor={vendas_hoje_valor}
                vendas_mes_valor={vendas_mes_valor}
                vendas_hoje_numero={vendas_hoje_numero}
                vendas_ano_valor={vendas_ano_valor}
                produtosAtivos={produtosAtivos}
            />
        </AuthenticatedLayout>
    );
}