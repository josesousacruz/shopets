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
    router.put(`/fornecedores/${supplier.id}`, supplier, {
      onSuccess: () => {
        Swal.fire('Sucesso!', 'Fornecedor atualizado com sucesso.', 'success');
      },
      onError: (errors) => {
        Swal.fire('Erro!', 'Não foi possível atualizar o fornecedor.', 'error');
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
          onSuccess: () => {
            Swal.fire('Deletado!', 'Fornecedor removido com sucesso.', 'success');
          },
          onError: (errors) => {
            Swal.fire('Erro!', 'Não foi possível remover o fornecedor.', 'error');
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
    />
  );
}


FornecedorIndex.layout = (page: React.ReactElement) => <AuthenticatedLayout children={page} currentView="fornecedores" />;