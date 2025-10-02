import { useState, useEffect, useCallback } from 'react';
import { Supplier } from '../types';

interface UseSupplierManagementOptions {
  initialSuppliers: Supplier[];
  onSupplierAdded?: (supplier: Supplier) => void;
}

export const useSupplierManagement = ({ 
  initialSuppliers, 
  onSupplierAdded 
}: UseSupplierManagementOptions) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update suppliers when initial suppliers change
  useEffect(() => {
    setSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  const addSupplier = useCallback(async (supplierData: Omit<Supplier, 'id'>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Generate temporary ID for immediate UI update
      const tempId = `temp_${Date.now()}`;
      const newSupplier: Supplier = {
        ...supplierData,
        id: tempId
      };

      // Update local state immediately
      setSuppliers(prev => [newSupplier, ...prev]);
      
      // Call parent callback if provided
      if (onSupplierAdded) {
        onSupplierAdded(newSupplier);
      }

      // Here you would typically make an API call to save the supplier
      // For now, we'll simulate it
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update with real ID from server (simulated)
      const realId = `supplier_${Date.now()}`;
      setSuppliers(prev => 
        prev.map(s => s.id === tempId ? { ...s, id: realId } : s)
      );

      return newSupplier;
    } catch (err) {
      setError('Erro ao adicionar fornecedor');
      // Remove the temporary supplier on error
      setSuppliers(prev => prev.filter(s => s.id !== tempId));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [onSupplierAdded]);

  const updateSupplier = useCallback(async (id: string, updates: Partial<Supplier>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      setSuppliers(prev => 
        prev.map(s => s.id === id ? { ...s, ...updates } : s)
      );
      
      // Here you would make an API call to update the supplier
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (err) {
      setError('Erro ao atualizar fornecedor');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeSupplier = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      setSuppliers(prev => prev.filter(s => s.id !== id));
      
      // Here you would make an API call to delete the supplier
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (err) {
      setError('Erro ao remover fornecedor');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSupplierById = useCallback((id: string) => {
    return suppliers.find(s => s.id === id);
  }, [suppliers]);

  const searchSuppliers = useCallback((query: string) => {
    if (!query.trim()) return suppliers;
    
    const lowercaseQuery = query.toLowerCase();
    return suppliers.filter(supplier => 
      (supplier.name || '').toLowerCase().includes(lowercaseQuery) ||
      supplier.email?.toLowerCase().includes(lowercaseQuery) ||
      supplier.phone?.includes(query)
    );
  }, [suppliers]);

  const getActiveSuppliers = useCallback(() => {
    return suppliers.filter(s => s.status === 'active');
  }, [suppliers]);

  return {
    suppliers,
    isLoading,
    error,
    addSupplier,
    updateSupplier,
    removeSupplier,
    getSupplierById,
    searchSuppliers,
    getActiveSuppliers,
    clearError: () => setError(null)
  };
};