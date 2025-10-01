import React from 'react';
import { router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import Swal from 'sweetalert2';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import FinanceiroView from '@/components/views/FinanceiroView';
import { AccountPayable, AccountReceivable, Supplier, Customer, Sale } from '@/types';

interface FluxoCaixaData {
    dailyData: {
        date: string;
        entradas: number;
        saidas: number;
        saldo: number;
    }[];
    statistics: {
        totalEntradas: number;
        totalSaidas: number;
        saldoTotal: number;
        entradasHoje: number;
        saidasHoje: number;
        saldoHoje: number;
    };
}

interface FinanceiroIndexProps {
    accountsPayable: AccountPayable[];
    accountsReceivable: AccountReceivable[];
    suppliers: Supplier[];
    customers: Customer[];
    sales: Sale[];
    fluxoCaixaData?: FluxoCaixaData;
    statistics?: {
        totalPagar: number;
        totalReceber: number;
        vendasHoje: number;
        contasVencidas: number;
    };
    payableStatistics?: {
        totalPendente: number;
        totalVencido: number;
        totalPagoMes: number;
        quantidadeVencidas: number;
    };
    receivableStatistics?: {
        totalPendente: number;
        totalVencido: number;
        totalRecebidoMes: number;
        quantidadeVencidas: number;
    };
}

export default function Index({ 
    accountsPayable, 
    accountsReceivable, 
    suppliers, 
    customers, 
    sales,
    fluxoCaixaData,
    statistics,
    payableStatistics,
    receivableStatistics
}: FinanceiroIndexProps) {
    const handleAddEntry = (entry: Partial<AccountPayable> | Partial<AccountReceivable>, type: 'payable' | 'receivable') => {
        const endpoint = type === 'payable' ? route('contas-pagar.store') : route('contas-receber.store');
        
        router.post(endpoint, entry, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                Swal.fire({
                    title: 'Sucesso!',
                    text: type === 'payable' ? 'Conta a pagar criada com sucesso!' : 'Conta a receber criada com sucesso!',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            onError: (errors) => {
                console.error('Erro ao criar conta:', errors);
                Swal.fire({
                    title: 'Erro!',
                    text: 'Erro ao criar lançamento financeiro.',
                    icon: 'error'
                });
            }
        });
    };

    const handleUpdateStatus = (id: number, type: 'payable' | 'receivable', status?: string) => {
        let endpoint: string;
        let successMessage: string;
        
        if (type === 'payable') {
            if (status === 'pago') {
                endpoint = route('contas-pagar.pagar', id);
                successMessage = 'Conta marcada como paga!';
            } else if (status === 'cancelado') {
                endpoint = route('contas-pagar.cancelar', id);
                successMessage = 'Conta cancelada com sucesso!';
            } else {
                console.error('Status não suportado para contas a pagar:', status);
                return;
            }
        } else if (type === 'receivable') {
            // Para contas a receber, o status é tratado pelo modal de recebimento
            // Esta função não é usada diretamente para contas a receber
            console.warn('handleUpdateStatus não deve ser usado diretamente para contas a receber. Use o modal de recebimento.');
            return;
        } else {
            console.error('Tipo não suportado:', type);
            return;
        }
        
        router.put(endpoint, {}, {
            preserveState: true,
            preserveScroll: true,
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
            <FinanceiroView
                accountsPayable={accountsPayable}
                accountsReceivable={accountsReceivable}
                suppliers={suppliers}
                customers={customers}
                sales={sales}
                fluxoCaixaData={fluxoCaixaData}
                statistics={statistics}
                payableStatistics={payableStatistics}
                receivableStatistics={receivableStatistics}
                onAddEntry={handleAddEntry}
                onUpdateStatus={handleUpdateStatus}
            />
        </AuthenticatedLayout>
    );
}