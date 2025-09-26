import React from 'react';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import ClientesView from '@/components/views/ClientesView';
import { Customer, LoyaltyProgram, LoyaltyTransaction, AccountReceivable } from '@/types';

interface ClienteIndexProps {
    customers: Customer[];
    loyaltyProgram: LoyaltyProgram;
    loyaltyTransactions: LoyaltyTransaction[];
    accountsReceivable: AccountReceivable[];
}

export default function Index({ customers, loyaltyProgram, loyaltyTransactions, accountsReceivable }: ClienteIndexProps) {
    const handleAddCustomer = (customerData: Omit<Customer, 'id'>) => {
        router.post('/clientes', customerData, {
            onSuccess: () => {
                Swal.fire({
                    title: 'Sucesso!',
                    text: 'Cliente cadastrado com sucesso!',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            onError: () => {
                Swal.fire({
                    title: 'Erro!',
                    text: 'Erro ao cadastrar cliente.',
                    icon: 'error'
                });
            }
        });
    };

    const handleUpdateCustomer = (customer: Customer) => {
        router.put(`/clientes/${customer.id}`, customer, {
            onSuccess: () => {
                Swal.fire({
                    title: 'Sucesso!',
                    text: 'Cliente atualizado com sucesso!',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            onError: () => {
                Swal.fire({
                    title: 'Erro!',
                    text: 'Erro ao atualizar cliente.',
                    icon: 'error'
                });
            }
        });
    };

    const handleAddLoyaltyTransaction = (transaction: Omit<LoyaltyTransaction, 'id'>) => {
        router.post('/clientes/loyalty-transaction', transaction, {
            onSuccess: () => {
                Swal.fire({
                    title: 'Sucesso!',
                    text: 'Pontos de fidelidade adicionados com sucesso!',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            onError: () => {
                Swal.fire({
                    title: 'Erro!',
                    text: 'Erro ao adicionar pontos de fidelidade.',
                    icon: 'error'
                });
            }
        });
    };

    const handleAddAccountReceivable = (accountReceivable: Omit<AccountReceivable, 'id'>) => {
        router.post('/financeiro/receivable', accountReceivable, {
            onSuccess: () => {
                Swal.fire({
                    title: 'Sucesso!',
                    text: 'Conta a receber criada com sucesso!',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            onError: () => {
                Swal.fire({
                    title: 'Erro!',
                    text: 'Erro ao criar conta a receber.',
                    icon: 'error'
                });
            }
        });
    };

    return (
        <AuthenticatedLayout currentView="clientes">
            <ClientesView
                customers={customers}
                loyaltyProgram={loyaltyProgram}
                loyaltyTransactions={loyaltyTransactions}
                onAddCustomer={handleAddCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                onAddLoyaltyTransaction={handleAddLoyaltyTransaction}
                onAddAccountReceivable={handleAddAccountReceivable}
                accountsReceivable={accountsReceivable}
            />
        </AuthenticatedLayout>
    );
}