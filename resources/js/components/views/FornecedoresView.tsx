import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit, Package, User, Phone, Mail, MapPin, Trash2, RotateCcw } from 'lucide-react';
import { Supplier, Product, SupplierFormData } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import FornecedorForm from '../forms/FornecedorForm';

interface FornecedoresViewProps {
  suppliers: Supplier[];
  products: Product[];
  onAddSupplier: (supplier: SupplierFormData) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplierId: string) => void;
  onReactivateSupplier: (supplierId: string) => void;
}

const FornecedoresView: React.FC<FornecedoresViewProps> = ({ suppliers, products, onAddSupplier, onUpdateSupplier, onDeleteSupplier, onReactivateSupplier }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>();

  const filteredSuppliers = useMemo(() => {
    if (!searchTerm.trim()) {
      return suppliers;
    }
    
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    
    return suppliers.filter(supplier => {
      const matchesSupplierInfo =
        (supplier.name || '').toLowerCase().includes(lowercasedSearchTerm) ||
        supplier.contactPerson?.toLowerCase().includes(lowercasedSearchTerm);
  
      if (matchesSupplierInfo) {
        return true;
      }
  
      const matchesProducts = supplier.productIds?.some(productId => {
        const product = products.find(p => p.id === productId);
        return product && product.name.toLowerCase().includes(lowercasedSearchTerm);
      }) || false;
  
      return matchesProducts;
    });
  }, [suppliers, products, searchTerm]);

  const handleNewSupplier = () => {
    setEditingSupplier(undefined);
    setIsFormOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsFormOpen(true);
  };

  const handleSaveSupplier = (supplierData: SupplierFormData) => {
    if (editingSupplier) {
      onUpdateSupplier({ ...supplierData, id_fornecedor: editingSupplier.id_fornecedor });
    } else {
      onAddSupplier(supplierData);
    }
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por fornecedor, contato ou produto..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          <button 
            onClick={handleNewSupplier} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
          >
            <Plus size={20} />
            <span className="font-medium">Novo Fornecedor</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredSuppliers.map(supplier => (
            <motion.div
              key={supplier.id_fornecedor}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-200/80 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col"
            >
              <div className="p-5 border-b border-gray-200/80">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-xl font-bold text-gray-900 truncate">{supplier.name}</h3>
                    {!supplier.ativo && (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                        Inativo
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <button onClick={() => handleEditSupplier(supplier)} className="text-gray-400 hover:text-blue-600 p-1 rounded-full transition-colors">
                      <Edit size={18} />
                    </button>
                    {!supplier.ativo ? (
                      <button onClick={() => onReactivateSupplier(supplier.id_fornecedor)} className="text-gray-400 hover:text-green-600 p-1 rounded-full transition-colors" title="Reativar fornecedor">
                        <RotateCcw size={18} />
                      </button>
                    ) : (
                      <button onClick={() => onDeleteSupplier(supplier.id_fornecedor)} className="text-gray-400 hover:text-red-600 p-1 rounded-full transition-colors">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
                {supplier.contactPerson && (
                  <div className="flex items-center space-x-2 mt-2 text-sm text-gray-500">
                    <User size={14} />
                    <span>{supplier.contactPerson}</span>
                  </div>
                )}
              </div>

              <div className="p-5 space-y-3 flex-grow">
                <div className="flex items-center space-x-3 text-sm">
                  <Phone size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700">{supplier.phone}</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <Mail size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700 truncate">{supplier.email}</span>
                </div>
                {supplier.address && (
                    <div className="flex items-start space-x-3 text-sm">
                        <MapPin size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{supplier.address}</span>
                    </div>
                )}
              </div>

              <div className="bg-gray-50/70 px-5 py-4 border-t border-gray-200/80">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Produtos Fornecidos ({supplier.productIds?.length || 0})
                </h4>
                {(supplier.productIds?.length || 0) > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {supplier.productIds?.slice(0, 4).map(productId => {
                      const product = products.find(p => p.id === productId);
                      return product ? (
                        <span key={productId} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                          {product.name}
                        </span>
                      ) : null;
                    })}
                    {(supplier.productIds?.length || 0) > 4 && (
                      <span className="bg-gray-200 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full">
                        +{(supplier.productIds?.length || 0) - 4} mais
                      </span>
                    )}
                  </div>
                ) : (
                    <p className="text-xs text-gray-400">Nenhum produto associado.</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-16">
          <Package size={48} className="mx-auto text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-800">Nenhum fornecedor encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">Tente ajustar sua busca ou adicione um novo fornecedor.</p>
        </div>
      )}

      <FornecedorForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSave={handleSaveSupplier} 
        supplier={editingSupplier}
        allProducts={products}
      />
    </div>
  );
};

export default FornecedoresView;
