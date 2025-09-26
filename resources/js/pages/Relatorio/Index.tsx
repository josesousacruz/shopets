import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import RelatoriosView from '@/components/views/RelatoriosView';
import { Sale, Product } from '@/types';

interface RelatorioIndexProps {
    sales: Sale[];
    products: Product[];
}

export default function Index({ sales, products }: RelatorioIndexProps) {
    return (
        <AuthenticatedLayout currentView="relatorios">
            <RelatoriosView
                sales={sales}
                products={products}
            />
        </AuthenticatedLayout>
    );
}