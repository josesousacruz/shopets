import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import FornecedoresView from '@/components/views/FornecedoresView';
import { Supplier, Product } from '@/types';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';

interface FornecedorProps {
  suppliers: Supplier[];
  products: Product[];
}

export default function FornecedorIndex({ suppliers, products }: FornecedorProps) {
  
  const handleAddSupplier = (supplier: Omit<Supplier, 'id'>) => {
    router.post('/fornecedores', supplier, {
      onSuccess: () => {
        Swal.fire('Sucesso!', 'Fornecedor adicionado com sucesso.', 'success');
      },
      onError: (errors) => {
        Swal.fire('Erro!', 'Não foi possível adicionar o fornecedor.', 'error');
      }
    });
  };

  const handleUpdateSupplier = (supplier: Supplier) => {
    router.put(`/fornecedores/${supplier.id_fornecedor}`, supplier, {
      onSuccess: (page) => {
        const message = page.props.flash?.success || 'Fornecedor atualizado com sucessoooo.';
        Swal.fire('Sucesso!', message, 'success');
      },
      onError: (errors) => {
        const message = 'Não foi possível atualizar o fornecedor.';
        Swal.fire('Erro!', message, 'error');
      }
    });
  };

  const handleDeleteSupplier = (supplierId: string) => {
    Swal.fire({
      title: 'Tem certeza?',
      text: 'Esta ação não pode ser desfeita!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim, deletar!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        router.delete(`/fornecedores/${supplierId}`, {
          onSuccess: (page) => {
            const message = page.props.flash?.success || 'Fornecedor removido com sucesso.';
            Swal.fire('Deletado!', message, 'success');
          },
          onError: (errors) => {
            const message = 'Não foi possível remover o fornecedor.';
            Swal.fire('Erro!', message, 'error');
          }
        });
      }
    });
  };

  const handleReactivateSupplier = (supplierId: string) => {
    Swal.fire({
      title: 'Reativar fornecedor?',
      text: 'O fornecedor será reativado e poderá ser usado novamente.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sim, reativar!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        router.patch(`/fornecedores/${supplierId}/reactivate`, {}, {
          onSuccess: (page) => {
            const message = page.props.flash?.success || 'Fornecedor reativado com sucesso.';
            Swal.fire('Reativado!', message, 'success');
          },
          onError: (errors) => {
            const message = page.props.flash?.error || 'Não foi possível reativar o fornecedor.';
            Swal.fire('Erro!', message, 'error');
          }
        });
      }
    });
  };

  return (
    <FornecedoresView
      suppliers={suppliers}
      products={products}
      onAddSupplier={handleAddSupplier}
      onUpdateSupplier={handleUpdateSupplier}
      onDeleteSupplier={handleDeleteSupplier}
      onReactivateSupplier={handleReactivateSupplier}
    />
  );
}


FornecedorIndex.layout = (page: React.ReactElement) => <AuthenticatedLayout children={page} currentView="fornecedores" />;