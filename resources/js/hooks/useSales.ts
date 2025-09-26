import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';

export interface Sale {
  id: number;
  date: string;
  total: number;
  paymentMethod: string;
  customerId?: number;
  customerName?: string;
  items: SaleItem[];
  discount: number;
  status: 'completed' | 'cancelled' | 'pending';
  operatorId: number;
  operatorName: string;
  notes?: string;
}

export interface SaleItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number;
}

export interface SaleFilters {
  startDate?: string;
  endDate?: string;
  customerId?: number;
  paymentMethod?: string;
  status?: string;
  operatorId?: number;
}

export function useSales() {
  const { props } = usePage();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SaleFilters>({});

  // Atualizar vendas quando as props mudarem
  useEffect(() => {
    if (props.sales) {
      setSales(props.sales as Sale[]);
    }
  }, [props.sales]);

  const loadSales = (newFilters?: SaleFilters) => {
    setLoading(true);
    const filterParams = { ...filters, ...newFilters };
    setFilters(filterParams);

    router.get('/vendas', filterParams, {
      preserveState: true,
      preserveScroll: true,
      onFinish: () => setLoading(false),
      onError: (errors) => {
        console.error('Erro ao carregar vendas:', errors);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao carregar vendas. Tente novamente.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    });
  };

  const createSale = (saleData: {
    items: Array<{
      id: number;
      quantity: number;
      price: number;
    }>;
    total: number;
    paymentMethod: string;
    customerId?: number;
    discount?: number;
    notes?: string;
  }) => {
    setLoading(true);

    router.post('/vendas', saleData, {
      onSuccess: () => {
        Swal.fire({
          title: 'Sucesso!',
          text: 'Venda realizada com sucesso!',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        // Atualizar lista de vendas
        if (props.sales) {
          setSales(props.sales as Sale[]);
        }
      },
      onError: (errors) => {
        console.error('Erro ao criar venda:', errors);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao realizar venda. Verifique os dados e tente novamente.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      },
      onFinish: () => setLoading(false)
    });
  };

  const cancelSale = (saleId: number, reason?: string) => {
    Swal.fire({
      title: 'Cancelar Venda',
      text: 'Tem certeza que deseja cancelar esta venda?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim, cancelar!',
      cancelButtonText: 'Não'
    }).then((result) => {
      if (result.isConfirmed) {
        setLoading(true);

        router.patch(`/vendas/${saleId}/cancel`, { reason }, {
          onSuccess: () => {
            Swal.fire({
              title: 'Cancelada!',
              text: 'Venda cancelada com sucesso!',
              icon: 'success',
              confirmButtonText: 'OK'
            });
            // Atualizar lista de vendas
            if (props.sales) {
              setSales(props.sales as Sale[]);
            }
          },
          onError: (errors) => {
            console.error('Erro ao cancelar venda:', errors);
            Swal.fire({
              title: 'Erro!',
              text: 'Erro ao cancelar venda. Tente novamente.',
              icon: 'error',
              confirmButtonText: 'OK'
            });
          },
          onFinish: () => setLoading(false)
        });
      }
    });
  };

  const getSaleDetails = (saleId: number) => {
    setLoading(true);

    router.get(`/vendas/${saleId}`, {}, {
      preserveState: true,
      preserveScroll: true,
      onFinish: () => setLoading(false),
      onError: (errors) => {
        console.error('Erro ao carregar detalhes da venda:', errors);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao carregar detalhes da venda.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    });
  };

  const printSaleReceipt = (saleId: number) => {
    setLoading(true);

    router.get(`/vendas/${saleId}/receipt`, {}, {
      preserveState: true,
      preserveScroll: true,
      onFinish: () => setLoading(false),
      onError: (errors) => {
        console.error('Erro ao gerar recibo:', errors);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao gerar recibo da venda.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    });
  };

  const getSalesReport = (reportFilters: {
    startDate: string;
    endDate: string;
    groupBy?: 'day' | 'week' | 'month';
    includeItems?: boolean;
  }) => {
    setLoading(true);

    router.get('/vendas/relatorio', reportFilters, {
      preserveState: true,
      preserveScroll: true,
      onFinish: () => setLoading(false),
      onError: (errors) => {
        console.error('Erro ao gerar relatório:', errors);
        Swal.fire({
          title: 'Erro!',
          text: 'Erro ao gerar relatório de vendas.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    });
  };

  // Estatísticas calculadas
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const completedSales = sales.filter(sale => sale.status === 'completed');
  const cancelledSales = sales.filter(sale => sale.status === 'cancelled');
  const pendingSales = sales.filter(sale => sale.status === 'pending');

  const salesStats = {
    total: totalSales,
    count: sales.length,
    completed: completedSales.length,
    cancelled: cancelledSales.length,
    pending: pendingSales.length,
    averageTicket: sales.length > 0 ? totalSales / sales.length : 0
  };

  return {
    sales,
    loading,
    filters,
    salesStats,
    loadSales,
    createSale,
    cancelSale,
    getSaleDetails,
    printSaleReceipt,
    getSalesReport,
    setFilters
  };
}