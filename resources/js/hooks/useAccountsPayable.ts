import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';

export interface AccountPayable {
  id: number;
  supplierId: number;
  supplierName: string;
  amount: number;
  dueDate: string;
  issueDate: string;
  description: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paymentDate?: string;
  paymentMethod?: string;
  discount?: number;
  interest?: number;
  finalAmount?: number;
  notes?: string;
  documentNumber?: string;
  category: string;
}

export interface AccountPayableFilters {
  supplierId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  overdue?: boolean;
}

export function useAccountsPayable() {
  const { props } = usePage();
  const [accountsPayable, setAccountsPayable] = useState<AccountPayable[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AccountPayableFilters>({});

  // Atualizar contas quando as props mudarem
  useEffect(() => {
    if (props.accountsPayable) {
      setAccountsPayable(props.accountsPayable as AccountPayable[]);
    }
  }, [props.accountsPayable]);

  const loadAccountsPayable = (newFilters?: AccountPayableFilters) => {
    setLoading(true);
    const filterParams = { ...filters, ...newFilters };
    setFilters(filterParams);

    router.get('/financeiro/contas-pagar', filterParams, {
      preserveState: true,
      preserveScroll: true,
      onFinish: () => setLoading(false),
      onError: (errors) => {
        console.error('Erro ao carregar contas a pagar:', errors);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao carregar contas a pagar. Tente novamente.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    });
  };

  const createAccountPayable = (accountData: {
    supplierId: number;
    amount: number;
    dueDate: string;
    description: string;
    category: string;
    documentNumber?: string;
    notes?: string;
  }) => {
    setLoading(true);

    router.post('/financeiro/contas-pagar', {
      ...accountData,
      type: 'payable'
    }, {
      onSuccess: () => {
        Swal.fire({
          title: 'Sucesso!',
          text: 'Conta a pagar criada com sucesso!',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        // Atualizar lista de contas
        if (props.accountsPayable) {
          setAccountsPayable(props.accountsPayable as AccountPayable[]);
        }
      },
      onError: (errors) => {
        console.error('Erro ao criar conta a pagar:', errors);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao criar conta a pagar. Verifique os dados e tente novamente.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      },
      onFinish: () => setLoading(false)
    });
  };

  const updateAccountPayable = (accountId: number, accountData: Partial<AccountPayable>) => {
    setLoading(true);

    router.put(`/financeiro/contas-pagar/${accountId}`, accountData, {
      onSuccess: () => {
        Swal.fire({
          title: 'Sucesso!',
          text: 'Conta a pagar atualizada com sucesso!',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        // Atualizar lista de contas
        if (props.accountsPayable) {
          setAccountsPayable(props.accountsPayable as AccountPayable[]);
        }
      },
      onError: (errors) => {
        console.error('Erro ao atualizar conta a pagar:', errors);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao atualizar conta a pagar. Tente novamente.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      },
      onFinish: () => setLoading(false)
    });
  };

  const payAccount = (accountId: number, paymentData: {
    paymentDate: string;
    paymentMethod: string;
    discount?: number;
    interest?: number;
    notes?: string;
  }) => {
    setLoading(true);

    router.patch(`/financeiro/contas-pagar/${accountId}/pay`, paymentData, {
      onSuccess: () => {
        Swal.fire({
          title: 'Sucesso!',
          text: 'Conta marcada como paga com sucesso!',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        // Atualizar lista de contas
        if (props.accountsPayable) {
          setAccountsPayable(props.accountsPayable as AccountPayable[]);
        }
      },
      onError: (errors) => {
        console.error('Erro ao marcar conta como paga:', errors);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao marcar conta como paga. Tente novamente.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      },
      onFinish: () => setLoading(false)
    });
  };

  const cancelAccount = (accountId: number, reason?: string) => {
    Swal.fire({
      title: 'Cancelar Conta',
      text: 'Tem certeza que deseja cancelar esta conta a pagar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim, cancelar!',
      cancelButtonText: 'Não'
    }).then((result) => {
      if (result.isConfirmed) {
        setLoading(true);

        router.patch(`/financeiro/contas-pagar/${accountId}/cancel`, { reason }, {
          onSuccess: () => {
            Swal.fire({
              title: 'Cancelada!',
              text: 'Conta cancelada com sucesso!',
              icon: 'success',
              confirmButtonText: 'OK'
            });
            // Atualizar lista de contas
            if (props.accountsPayable) {
              setAccountsPayable(props.accountsPayable as AccountPayable[]);
            }
          },
          onError: (errors) => {
            console.error('Erro ao cancelar conta:', errors);
            Swal.fire({
              title: 'Erro!',
              text: 'Erro ao cancelar conta. Tente novamente.',
              icon: 'error',
              confirmButtonText: 'OK'
            });
          },
          onFinish: () => setLoading(false)
        });
      }
    });
  };

  const deleteAccount = (accountId: number) => {
    Swal.fire({
      title: 'Excluir Conta',
      text: 'Tem certeza que deseja excluir esta conta a pagar? Esta ação não pode ser desfeita.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        setLoading(true);

        router.delete(`/financeiro/contas-pagar/${accountId}`, {
          onSuccess: () => {
            Swal.fire({
              title: 'Excluída!',
              text: 'Conta excluída com sucesso!',
              icon: 'success',
              confirmButtonText: 'OK'
            });
            // Atualizar lista de contas
            if (props.accountsPayable) {
              setAccountsPayable(props.accountsPayable as AccountPayable[]);
            }
          },
          onError: (errors) => {
            console.error('Erro ao excluir conta:', errors);
            Swal.fire({
              title: 'Erro!',
              text: 'Erro ao excluir conta. Tente novamente.',
              icon: 'error',
              confirmButtonText: 'OK'
            });
          },
          onFinish: () => setLoading(false)
        });
      }
    });
  };

  const getPayableReport = (reportFilters: {
    startDate: string;
    endDate: string;
    supplierId?: number;
    category?: string;
    status?: string;
  }) => {
    setLoading(true);

    router.get('/financeiro/contas-pagar/relatorio', reportFilters, {
      preserveState: true,
      preserveScroll: true,
      onFinish: () => setLoading(false),
      onError: (errors) => {
        console.error('Erro ao gerar relatório:', errors);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao gerar relatório de contas a pagar.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    });
  };

  // Estatísticas calculadas
  const totalAmount = accountsPayable.reduce((sum, account) => sum + account.amount, 0);
  const paidAccounts = accountsPayable.filter(account => account.status === 'paid');
  const pendingAccounts = accountsPayable.filter(account => account.status === 'pending');
  const overdueAccounts = accountsPayable.filter(account => account.status === 'overdue');
  const cancelledAccounts = accountsPayable.filter(account => account.status === 'cancelled');

  const payableStats = {
    total: totalAmount,
    count: accountsPayable.length,
    paid: paidAccounts.reduce((sum, account) => sum + (account.finalAmount || account.amount), 0),
    pending: pendingAccounts.reduce((sum, account) => sum + account.amount, 0),
    overdue: overdueAccounts.reduce((sum, account) => sum + account.amount, 0),
    paidCount: paidAccounts.length,
    pendingCount: pendingAccounts.length,
    overdueCount: overdueAccounts.length,
    cancelledCount: cancelledAccounts.length
  };

  return {
    accountsPayable,
    loading,
    filters,
    payableStats,
    loadAccountsPayable,
    createAccountPayable,
    updateAccountPayable,
    payAccount,
    cancelAccount,
    deleteAccount,
    getPayableReport,
    setFilters
  };
}