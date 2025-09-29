import React from 'react';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import ContasPagar from '@/components/financeiro/ContasPagar';
import { AccountPayable, Supplier } from '@/types';

interface ContasPagarIndexProps {
    contas: {
        data: AccountPayable[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    estatisticas: {
        total_pendente: number;
        total_vencido: number;
        total_pago_mes: number;
        quantidade_vencidas: number;
    };
    fornecedores: Supplier[];
    filtros: {
        status?: string;
        fornecedor_id?: number;
        data_inicio?: string;
        data_fim?: string;
        search?: string;
    };
}

export default function Index({ 
    contas, 
    estatisticas, 
    fornecedores, 
    filtros 
}: ContasPagarIndexProps) {
    
    const handleAdd = () => {
        router.get(route('contas-pagar.create'));
    };

    const handleUpdateStatus = (id: number, status: string) => {
        let endpoint: string;
        let successMessage: string;
        
        if (status === 'pago') {
            endpoint = route('contas-pagar.pagar', id);
            successMessage = 'Conta marcada como paga!';
        } else if (status === 'cancelado') {
            endpoint = route('contas-pagar.cancelar', id);
            successMessage = 'Conta cancelada com sucesso!';
        } else {
            console.error('Status não suportado:', status);
            return;
        }
        
        router.put(endpoint, {}, {
            onSuccess: () => {
                Swal.fire({
                    title: 'Sucesso!',
                    text: successMessage,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            onError: (errors) => {
                console.error('Erro ao atualizar status:', errors);
                Swal.fire({
                    title: 'Erro!',
                    text: 'Erro ao atualizar status.',
                    icon: 'error'
                });
            }
        });
    };

    return (
        <AuthenticatedLayout currentView="financeiro">
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <ContasPagar
                                accounts={contas.data}
                                suppliers={fornecedores}
                                onUpdateStatus={handleUpdateStatus}
                                onAdd={handleAdd}
                                totalPendente={estatisticas.total_pendente}
                                totalVencido={estatisticas.total_vencido}
                                totalPagoMes={estatisticas.total_pago_mes}
                                quantidadeVencidas={estatisticas.quantidade_vencidas}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}