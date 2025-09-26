import { useState, useCallback, useMemo } from 'react';
import { Customer, LoyaltyTransaction, LoyaltyLevel } from '../types';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';

export const useCustomers = (initialCustomers: Customer[] = [], initialLoyaltyTransactions: LoyaltyTransaction[] = []) => {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<LoyaltyTransaction[]>(initialLoyaltyTransactions);
  const [loading, setLoading] = useState(false);

  const addCustomer = useCallback((customerData: Omit<Customer, 'id' | 'loyaltyPoints' | 'loyaltyLevel' | 'totalSpent' | 'createdAt'>) => {
    setLoading(true);

    router.post('/clientes', customerData, {
      onSuccess: (page: any) => {
        // Atualiza a lista de clientes com os dados da página
        if (page.props.customers) {
          setCustomers(page.props.customers);
        }
        
        Swal.fire({
          title: 'Sucesso!',
          text: 'Cliente adicionado com sucesso',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        
        setLoading(false);
      },
      onError: (errors: any) => {
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao adicionar cliente',
          icon: 'error'
        });
        setLoading(false);
      }
    });
  }, []);

  const updateCustomer = useCallback((customerId: string, updates: Partial<Customer>) => {
    setLoading(true);

    router.put(`/clientes/${customerId}`, updates, {
      onSuccess: (page: any) => {
        // Atualiza a lista de clientes com os dados da página
        if (page.props.customers) {
          setCustomers(page.props.customers);
        }

        Swal.fire({
          title: 'Sucesso!',
          text: 'Cliente atualizado com sucesso',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        setLoading(false);
      },
      onError: (errors: any) => {
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao atualizar cliente',
          icon: 'error'
        });
        setLoading(false);
      }
    });
  }, []);

  const deleteCustomer = useCallback(async (customerId: string) => {
    const result = await Swal.fire({
      title: 'Tem certeza?',
      text: 'Esta ação não pode ser desfeita!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim, deletar!',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    setLoading(true);

    router.delete(`/clientes/${customerId}`, {
      onSuccess: (page: any) => {
        // Atualiza a lista de clientes com os dados da página
        if (page.props.customers) {
          setCustomers(page.props.customers);
        }
        // Remove transações de fidelidade do cliente deletado
        setLoyaltyTransactions(prev => prev.filter(transaction => transaction.customerId !== customerId));

        Swal.fire({
          title: 'Deletado!',
          text: 'Cliente deletado com sucesso',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        setLoading(false);
      },
      onError: (errors: any) => {
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao deletar cliente',
          icon: 'error'
        });
        setLoading(false);
      }
    });
  }, []);

  const toggleCustomerStatus = useCallback((customerId: string) => {
    setLoading(true);

    router.patch(`/clientes/${customerId}/toggle-status`, {}, {
      onSuccess: (page: any) => {
        // Atualiza a lista de clientes com os dados da página
        if (page.props.customers) {
          setCustomers(page.props.customers);
        }

        Swal.fire({
          title: 'Sucesso!',
          text: 'Status do cliente alterado com sucesso',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        setLoading(false);
      },
      onError: (errors: any) => {
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao alterar status do cliente',
          icon: 'error'
        });
        setLoading(false);
      }
    });
  }, []);

  const addLoyaltyPoints = useCallback((customerId: string, points: number, description: string, saleId?: string) => {
    setLoading(true);

    router.post(`/clientes/${customerId}/loyalty-transaction`, {
      type: 'earn',
      points,
      description,
      saleId
    }, {
      onSuccess: (page: any) => {
        // Atualizar clientes e transações com os dados da página
        if (page.props.customers) {
          setCustomers(page.props.customers);
        }
        if (page.props.loyaltyTransactions) {
          setLoyaltyTransactions(page.props.loyaltyTransactions);
        }

        Swal.fire({
          title: 'Sucesso!',
          text: 'Pontos de fidelidade adicionados com sucesso',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        setLoading(false);
      },
      onError: (errors: any) => {
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao adicionar pontos de fidelidade',
          icon: 'error'
        });
        setLoading(false);
      }
    });
  }, []);

  const redeemLoyaltyPoints = useCallback((customerId: string, points: number, description: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer || customer.loyaltyPoints < points) {
      Swal.fire({
        title: 'Erro!',
        text: 'Pontos insuficientes para resgate',
        icon: 'error'
      });
      return;
    }

    setLoading(true);

    router.post(`/clientes/${customerId}/redeem-points`, {
      points,
      description
    }, {
      onSuccess: (page: any) => {
        // Atualizar clientes e transações com os dados da página
        if (page.props.customers) {
          setCustomers(page.props.customers);
        }
        if (page.props.loyaltyTransactions) {
          setLoyaltyTransactions(page.props.loyaltyTransactions);
        }

        Swal.fire({
          title: 'Sucesso!',
          text: 'Pontos de fidelidade resgatados com sucesso',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        setLoading(false);
      },
      onError: (errors: any) => {
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao resgatar pontos de fidelidade',
          icon: 'error'
        });
        setLoading(false);
      }
    });
  }, [customers]);

  // Computed values
  const activeCustomers = useMemo(() => 
    customers.filter(customer => customer.isActive), 
    [customers]
  );

  const inactiveCustomers = useMemo(() => 
    customers.filter(customer => !customer.isActive), 
    [customers]
  );

  const customersByLoyaltyLevel = useMemo(() => {
    const levels = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    customers.forEach(customer => {
      const level = customer.loyaltyLevel || 'bronze';
      levels[level as keyof typeof levels]++;
    });
    return levels;
  }, [customers]);

  const totalCustomers = customers.length;
  const totalActiveCustomers = activeCustomers.length;
  const totalLoyaltyPoints = customers.reduce((sum, customer) => sum + customer.loyaltyPoints, 0);

  return {
    customers,
    loyaltyTransactions,
    loading,
    activeCustomers,
    inactiveCustomers,
    customersByLoyaltyLevel,
    totalCustomers,
    totalActiveCustomers,
    totalLoyaltyPoints,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    toggleCustomerStatus,
    addLoyaltyPoints,
    redeemLoyaltyPoints,
  };
};

const getLoyaltyLevel = (points: number): LoyaltyLevel => {
  if (points >= 10000) return 'platinum';
  if (points >= 5000) return 'gold';
  if (points >= 1000) return 'silver';
  return 'bronze';
};