import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import EstoqueView from '@/components/views/EstoqueView';
import { Product, Category, Supplier, StockEntry } from '@/types';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';

interface EstoqueProps {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
}

export default function EstoqueIndex({ products, categories, suppliers }: EstoqueProps) {
  
  const handleAddProduct = (product: Omit<Product, 'id'>) => {
    router.post('/estoque', product, {
      onSuccess: () => {
        Swal.fire('Sucesso!', 'Produto adicionado com sucesso.', 'success');
      },
      onError: (errors) => {
        Swal.fire('Erro!', 'Não foi possível adicionar o produto.', 'error');
      }
    });
  };

  const handleUpdateProduct = (product: Product) => {
    router.put(`/estoque/${product.id}`, product, {
      onSuccess: () => {
        Swal.fire('Sucesso!', 'Produto atualizado com sucesso.', 'success');
      },
      onError: (errors) => {
        Swal.fire('Erro!', 'Não foi possível atualizar o produto.', 'error');
      }
    });
  };

  const handleAddStock = (productId: string, stockEntry: Omit<StockEntry, 'id'>) => {
    router.post('/estoque/add-stock', { productId, ...stockEntry }, {
      onSuccess: () => {
        Swal.fire('Sucesso!', 'Estoque adicionado com sucesso.', 'success');
      },
      onError: (errors) => {
        Swal.fire('Erro!', 'Não foi possível adicionar estoque.', 'error');
      }
    });
  };

  const handleAddCategory = (category: Omit<Category, 'id'>) => {
    router.post('/estoque/categories', category, {
      onSuccess: () => {
        Swal.fire('Sucesso!', 'Categoria adicionada com sucesso.', 'success');
      },
      onError: (errors) => {
        Swal.fire('Erro!', 'Não foi possível adicionar a categoria.', 'error');
      }
    });
  };

  const handleUpdateCategory = (category: Category) => {
    router.put(`/estoque/categories/${category.id}`, category, {
      onSuccess: () => {
        Swal.fire('Sucesso!', 'Categoria atualizada com sucesso.', 'success');
      },
      onError: (errors) => {
        Swal.fire('Erro!', 'Não foi possível atualizar a categoria.', 'error');
      }
    });
  };

  const handleDeleteCategory = (categoryId: string) => {
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
        router.delete(`/estoque/categories/${categoryId}`, {
          onSuccess: () => {
            Swal.fire('Deletado!', 'Categoria removida com sucesso.', 'success');
          },
          onError: (errors) => {
            Swal.fire('Erro!', 'Não foi possível remover a categoria.', 'error');
          }
        });
      }
    });
  };

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

  return (
    <EstoqueView
      products={products}
      categories={categories}
      suppliers={suppliers}
      onAddProduct={handleAddProduct}
      onUpdateProduct={handleUpdateProduct}
      onAddStock={handleAddStock}
      onAddCategory={handleAddCategory}
      onUpdateCategory={handleUpdateCategory}
      onDeleteCategory={handleDeleteCategory}
      onAddSupplier={handleAddSupplier}
    />
  );
}

EstoqueIndex.layout = (page: React.ReactElement) => <AuthenticatedLayout children={page} currentView="estoque" />;