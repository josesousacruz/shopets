import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';

export interface AccountReceivable {
  id: number;
  customerId: number;
  customerName: string;
  amount: number;
  dueDate: string;
  issueDate: string;
  description: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'partial';
  paymentDate?: string;
  paymentMethod?: string;
  discount?: number;
  interest?: number;
  finalAmount?: number;
  paidAmount?: number;
  notes?: string;
  documentNumber?: string;
  category: string;
  saleId?: number;
  installment?: number;
  totalInstallments?: number;
}

export interface AccountReceivableFilters {
  customerId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  overdue?: boolean;
  saleId?: number;
}

export function useAccountsReceivable() {
  const { props } = usePage();
  const [accountsReceivable, setAccountsReceivable] = useState<AccountReceivable[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AccountReceivableFilters>({});

  // Atualizar contas quando as props mudarem
  useEffect(() => {
    if (props.accountsReceivable) {
      setAccountsReceivable(props.accountsReceivable as AccountReceivable[]);
    }
  }, [props.accountsReceivable]);

  const loadAccountsReceivable = (newFilters?: AccountReceivableFilters) => {
    setLoading(true);
    const filterParams = { ...filters, ...newFilters };
    setFilters(filterParams);

    router.get('/financeiro/contas-receber', filterParams, {
      preserveState: true,
      preserveScroll: true,
      onFinish: () => setLoading(false),
      onError: (errors) => {
        console.error('Erro ao carregar contas a receber:', errors);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao carregar contas a receber. Tente novamente.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    });
  };

  const createAccountReceivable = (accountData: {
    customerId: number;
    amount: number;
    dueDate: string;
    description: string;
    category: string;
    documentNumber?: string;
    notes?: string;
    saleId?: number;
    installment?: number;
    totalInstallments?: number;
  }) => {
    setLoading(true);

    router.post('/financeiro/contas-receber', {
      ...accountData,
      type: 'receivable'
    }, {
      onSuccess: () => {
        Swal.fire({
          title: 'Sucesso!',
          text: 'Conta a receber criada com sucesso!',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        // Atualizar lista de contas
        if (props.accountsReceivable) {
          setAccountsReceivable(props.accountsReceivable as AccountReceivable[]);
        }
      },
      onError: (errors) => {
        console.error('Erro ao criar conta a receber:', errors);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao criar conta a receber. Verifique os dados e tente novamente.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      },
      onFinish: () => setLoading(false)
    });
  };

  const updateAccountReceivable = (accountId: number, accountData: Partial<AccountReceivable>) => {
    setLoading(true);

    router.put(`/financeiro/contas-receber/${accountId}`, accountData, {
      onSuccess: () => {
        Swal.fire({
          title: 'Sucesso!',
          text: 'Conta a receber atualizada com sucesso!',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        // Atualizar lista de contas
        if (props.accountsReceivable) {
          setAccountsReceivable(props.accountsReceivable as AccountReceivable[]);
        }
      },
      onError: (errors) => {
        console.error('Erro ao atualizar conta a receber:', errors);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao atualizar conta a receber. Tente novamente.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      },
      onFinish: () => setLoading(false)
    });
  };

  const receivePayment = (accountId: number, paymentData: {
    paymentDate: string;
    paymentMethod: string;
    amount: number;
    discount?: number;
    interest?: number;
    notes?: string;
  }) => {
    setLoading(true);

    router.patch(`/financeiro/contas-receber/${accountId}/receive`, paymentData, {
      onSuccess: () => {
        Swal.fire({
          title: 'Sucesso!',
          text: 'Pagamento registrado com sucesso!',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        // Atualizar lista de contas
        if (props.accountsReceivable) {
          setAccountsReceivable(props.accountsReceivable as AccountReceivable[]);
        }
      },
      onError: (errors) => {
        console.error('Erro ao registrar pagamento:', errors);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao registrar pagamento. Tente novamente.',
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
      text: 'Tem certeza que deseja cancelar esta conta a receber?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim, cancelar!',
      cancelButtonText: 'Não'
    }).then((result) => {
      if (result.isConfirmed) {
        setLoading(true);

        router.patch(`/financeiro/contas-receber/${accountId}/cancel`, { reason }, {
          onSuccess: () => {
            Swal.fire({
              title: 'Cancelada!',
              text: 'Conta cancelada com sucesso!',
              icon: 'success',
              confirmButtonText: 'OK'
            });
            // Atualizar lista de contas
            if (props.accountsReceivable) {
              setAccountsReceivable(props.accountsReceivable as AccountReceivable[]);
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
      text: 'Tem certeza que deseja excluir esta conta a receber? Esta ação não pode ser desfeita.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        setLoading(true);

        router.delete(`/financeiro/contas-receber/${accountId}`, {
          onSuccess: () => {
            Swal.fire({
              title: 'Excluída!',
              text: 'Conta excluída com sucesso!',
              icon: 'success',
              confirmButtonText: 'OK'
            });
            // Atualizar lista de contas
            if (props.accountsReceivable) {
              setAccountsReceivable(props.accountsReceivable as AccountReceivable[]);
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

  const sendReminder = (accountId: number, reminderType: 'email' | 'sms' | 'whatsapp') => {
    setLoading(true);

    router.post(`/financeiro/contas-receber/${accountId}/reminder`, { type: reminderType }, {
      onSuccess: () => {
        Swal.fire({
          title: 'Sucesso!',
          text: 'Lembrete enviado com sucesso!',
          icon: 'success',
          confirmButtonText: 'OK'
        });
      },
      onError: (errors) => {
        console.error('Erro ao enviar lembrete:', errors);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao enviar lembrete. Tente novamente.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      },
      onFinish: () => setLoading(false)
    });
  };

  const getReceivableReport = (reportFilters: {
    startDate: string;
    endDate: string;
    customerId?: number;
    category?: string;
    status?: string;
  }) => {
    setLoading(true);

    router.get('/financeiro/contas-receber/relatorio', reportFilters, {
      preserveState: true,
      preserveScroll: true,
      onFinish: () => setLoading(false),
      onError: (errors) => {
        console.error('Erro ao gerar relatório:', errors);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao gerar relatório de contas a receber.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    });
  };

  const generateInstallments = (accountData: {
    customerId: number;
    totalAmount: number;
    installments: number;
    firstDueDate: string;
    description: string;
    category: string;
    saleId?: number;
  }) => {
    setLoading(true);

    router.post('/financeiro/contas-receber/parcelamento', accountData, {
      onSuccess: () => {
        Swal.fire({
          title: 'Sucesso!',
          text: 'Parcelamento criado com sucesso!',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        // Atualizar lista de contas
        if (props.accountsReceivable) {
          setAccountsReceivable(props.accountsReceivable as AccountReceivable[]);
        }
      },
      onError: (errors) => {
        console.error('Erro ao criar parcelamento:', errors);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao criar parcelamento. Tente novamente.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      },
      onFinish: () => setLoading(false)
    });
  };

  // Estatísticas calculadas
  const totalAmount = accountsReceivable.reduce((sum, account) => sum + account.amount, 0);
  const paidAccounts = accountsReceivable.filter(account => account.status === 'paid');
  const pendingAccounts = accountsReceivable.filter(account => account.status === 'pending');
  const overdueAccounts = accountsReceivable.filter(account => account.status === 'overdue');
  const partialAccounts = accountsReceivable.filter(account => account.status === 'partial');
  const cancelledAccounts = accountsReceivable.filter(account => account.status === 'cancelled');

  const receivableStats = {
    total: totalAmount,
    count: accountsReceivable.length,
    received: paidAccounts.reduce((sum, account) => sum + (account.finalAmount || account.amount), 0),
    pending: pendingAccounts.reduce((sum, account) => sum + account.amount, 0),
    overdue: overdueAccounts.reduce((sum, account) => sum + account.amount, 0),
    partial: partialAccounts.reduce((sum, account) => sum + (account.paidAmount || 0), 0),
    paidCount: paidAccounts.length,
    pendingCount: pendingAccounts.length,
    overdueCount: overdueAccounts.length,
    partialCount: partialAccounts.length,
    cancelledCount: cancelledAccounts.length
  };

  return {
    accountsReceivable,
    loading,
    filters,
    receivableStats,
    loadAccountsReceivable,
    createAccountReceivable,
    updateAccountReceivable,
    receivePayment,
    cancelAccount,
    deleteAccount,
    sendReminder,
    getReceivableReport,
    generateInstallments,
    setFilters
  };
}