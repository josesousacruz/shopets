import React from 'react';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import ContasReceber from '@/components/financeiro/ContasReceber';
import { AccountReceivable, Customer } from '@/types';

interface ContasReceberIndexProps {
    contas: {
        data: AccountReceivable[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    estatisticas: {
        total_pendente: number;
        total_vencido: number;
        total_recebido_mes: number;
        quantidade_vencidas: number;
    };
    clientes: Customer[];
    filtros: {
        status?: string;
        cliente_id?: number;
        data_inicio?: string;
        data_fim?: string;
        search?: string;
    };
}

export default function Index({ contas, estatisticas, clientes, filtros }: ContasReceberIndexProps) {
    const handleAdd = () => {
        router.visit('/contas-receber/create');
    };

    const handleUpdateStatus = (id: number, type: 'payable' | 'receivable') => {
        // Esta função será chamada pelos modais
        console.log('Status update:', { id, type });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                    Contas a Receber
                </h2>
            }
        >
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <ContasReceber
                                accounts={contas.data}
                                customers={clientes}
                                onUpdateStatus={handleUpdateStatus}
                                onAdd={handleAdd}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}