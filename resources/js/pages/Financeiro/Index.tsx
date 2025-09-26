import React from 'react';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import FinanceiroView from '@/components/views/FinanceiroView';
import { AccountPayable, AccountReceivable, Supplier, Customer, Sale } from '@/types';

interface FinanceiroIndexProps {
    accountsPayable: AccountPayable[];
    accountsReceivable: AccountReceivable[];
    suppliers: Supplier[];
    customers: Customer[];
    sales: Sale[];
    statistics?: {
        totalPagar: number;
        totalReceber: number;
        vendasHoje: number;
        contasVencidas: number;
    };
}

export default function Index({ 
    accountsPayable, 
    accountsReceivable, 
    suppliers, 
    customers, 
    sales,
    statistics 
}: FinanceiroIndexProps) {
    const handleAddEntry = (entry: Partial<AccountPayable> | Partial<AccountReceivable>, type: 'payable' | 'receivable') => {
        const endpoint = type === 'payable' ? route('contas-pagar.store') : route('contas-receber.store');
        
        router.post(endpoint, entry, {
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

    const handleUpdateStatus = (id: number, type: 'payable' | 'receivable') => {
        const endpoint = type === 'payable' 
            ? route('contas-pagar.pagar', id) 
            : route('contas-receber.receber', id);
        
        router.put(endpoint, {}, {
            onSuccess: () => {
                Swal.fire({
                    title: 'Sucesso!',
                    text: type === 'payable' ? 'Conta marcada como paga!' : 'Conta marcada como recebida!',
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
                statistics={statistics}
                onAddEntry={handleAddEntry}
                onUpdateStatus={handleUpdateStatus}
            />
        </AuthenticatedLayout>
    );
}