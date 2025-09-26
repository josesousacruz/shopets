import { useState, useCallback } from 'react';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Supplier } from '../types';

interface UseSupplierOptions {
  initialSuppliers?: Supplier[];
  onSupplierAdded?: (supplier: Supplier) => void;
  onSupplierUpdated?: (supplier: Supplier) => void;
  onSupplierDeleted?: (supplierId: string) => void;
}

export const useSuppliers = (options: UseSupplierOptions = {}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(options.initialSuppliers || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add new supplier
  const addSupplier = useCallback(async (supplierData: Omit<Supplier, 'id'>) => {
    setIsLoading(true);
    setError(null);

    try {
      // If using Inertia.js for backend communication
      router.post('/fornecedores', supplierData, {
        onSuccess: (page) => {
          const newSupplier = page.props.supplier as Supplier;
          setSuppliers(prev => [newSupplier, ...prev]);
          
          Swal.fire({
            title: 'Fornecedor Cadastrado!',
            text: `Fornecedor "${supplierData.name}" cadastrado com sucesso!`,
            icon: 'success',
            confirmButtonText: 'OK',
            confirmButtonColor: '#10b981'
          });

          options.onSupplierAdded?.(newSupplier);
        },
        onError: (errors) => {
          setError('Erro ao cadastrar fornecedor');
          Swal.fire({
            title: 'Erro!',
            text: 'Não foi possível cadastrar o fornecedor.',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        },
        onFinish: () => setIsLoading(false)
      });
    } catch (err) {
      setError('Erro inesperado ao cadastrar fornecedor');
      setIsLoading(false);
    }
  }, [options]);

  // Update supplier
  const updateSupplier = useCallback(async (supplier: Supplier) => {
    setIsLoading(true);
    setError(null);

    try {
      router.put(`/fornecedores/${supplier.id}`, supplier, {
        onSuccess: () => {
          setSuppliers(prev =>
            prev.map(s => s.id === supplier.id ? supplier : s)
          );

          Swal.fire({
            title: 'Fornecedor Atualizado!',
            text: `Fornecedor "${supplier.name}" atualizado com sucesso!`,
            icon: 'success',
            confirmButtonText: 'OK',
            confirmButtonColor: '#10b981'
          });

          options.onSupplierUpdated?.(supplier);
        },
        onError: (errors) => {
          setError('Erro ao atualizar fornecedor');
          Swal.fire({
            title: 'Erro!',
            text: 'Não foi possível atualizar o fornecedor.',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        },
        onFinish: () => setIsLoading(false)
      });
    } catch (err) {
      setError('Erro inesperado ao atualizar fornecedor');
      setIsLoading(false);
    }
  }, [options]);

  // Delete supplier
  const deleteSupplier = useCallback(async (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    const result = await Swal.fire({
      title: 'Confirmar Exclusão',
      text: `Tem certeza que deseja excluir o fornecedor "${supplier.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    setIsLoading(true);
    setError(null);

    try {
      router.delete(`/fornecedores/${supplierId}`, {
        onSuccess: () => {
          setSuppliers(prev => prev.filter(s => s.id !== supplierId));

          Swal.fire({
            title: 'Fornecedor Excluído!',
            text: `Fornecedor "${supplier.name}" excluído com sucesso!`,
            icon: 'success',
            confirmButtonText: 'OK',
            confirmButtonColor: '#10b981'
          });

          options.onSupplierDeleted?.(supplierId);
        },
        onError: (errors) => {
          setError('Erro ao excluir fornecedor');
          Swal.fire({
            title: 'Erro!',
            text: 'Não foi possível excluir o fornecedor.',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        },
        onFinish: () => setIsLoading(false)
      });
    } catch (err) {
      setError('Erro inesperado ao excluir fornecedor');
      setIsLoading(false);
    }
  }, [suppliers, options]);

  // Get supplier by ID
  const getSupplierById = useCallback((supplierId: string) => {
    return suppliers.find(s => s.id === supplierId);
  }, [suppliers]);

  // Search suppliers
  const searchSuppliers = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return suppliers;

    const lowercasedTerm = searchTerm.toLowerCase();
    return suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(lowercasedTerm) ||
      supplier.contactPerson?.toLowerCase().includes(lowercasedTerm) ||
      supplier.email.toLowerCase().includes(lowercasedTerm) ||
      supplier.phone.toLowerCase().includes(lowercasedTerm)
    );
  }, [suppliers]);

  // Get active suppliers only
  const getActiveSuppliers = useCallback(() => {
    return suppliers.filter(supplier => supplier.active !== false);
  }, [suppliers]);

  // Get suppliers for a specific product
  const getSuppliersForProduct = useCallback((productId: string) => {
    return suppliers.filter(supplier =>
      supplier.productIds?.includes(productId)
    );
  }, [suppliers]);

  // Refresh suppliers from server
  const refreshSuppliers = useCallback(() => {
    setIsLoading(true);
    setError(null);

    router.get('/fornecedores', {}, {
      onSuccess: (page) => {
        setSuppliers(page.props.suppliers as Supplier[]);
      },
      onError: () => {
        setError('Erro ao carregar fornecedores');
      },
      onFinish: () => setIsLoading(false)
    });
  }, []);

  return {
    suppliers,
    isLoading,
    error,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierById,
    searchSuppliers,
    getActiveSuppliers,
    getSuppliersForProduct,
    refreshSuppliers,
    setSuppliers
  };
};

export default useSuppliers;