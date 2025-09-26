import React, { useState } from 'react';
import { Plus, Search, User, Phone, Mail } from 'lucide-react';
import { Supplier } from '../../types';
import QuickSupplierModal from '../modals/QuickSupplierModal';

interface SupplierSelectorProps {
  suppliers: Supplier[];
  selectedSupplierId?: string;
  onSupplierSelect: (supplierId: string) => void;
  onAddNewSupplier?: () => void;
  onSupplierAdded?: (supplier: Supplier) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  showQuickAdd?: boolean;
  showSupplierDetails?: boolean;
  className?: string;
}

export const SupplierSelector: React.FC<SupplierSelectorProps> = ({
  suppliers,
  selectedSupplierId,
  onSupplierSelect,
  onAddNewSupplier,
  onSupplierAdded,
  placeholder = "Selecione um fornecedor",
  error,
  required = false,
  showQuickAdd = true,
  showSupplierDetails = false,
  className = ""
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSupplierSelect = (supplier: Supplier) => {
    onSupplierSelect(supplier.id);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  const handleQuickAdd = () => {
    if (onAddNewSupplier) {
      onAddNewSupplier();
      setIsDropdownOpen(false);
    } else {
      setIsQuickModalOpen(true);
      setIsDropdownOpen(false);
    }
  };

  const handleQuickSupplierSave = (supplierData: Omit<Supplier, 'id'>) => {
    // Generate a temporary ID for the new supplier
    const newSupplier: Supplier = {
      ...supplierData,
      id: `temp-${Date.now()}`,
    };

    // Add to local suppliers list if onSupplierAdded is provided
    if (onSupplierAdded) {
      onSupplierAdded(newSupplier);
    }

    // Select the new supplier
    onSupplierSelect(newSupplier.id);
    setIsQuickModalOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        <User className="w-4 h-4 inline mr-1" />
        Fornecedor {required && '*'}
      </label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left flex items-center justify-between ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${selectedSupplier ? 'text-gray-900' : 'text-gray-500'}`}
        >
          <span className="truncate">
            {selectedSupplier ? selectedSupplier.name : placeholder}
          </span>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isDropdownOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Add Button */}
            {showQuickAdd && onAddNewSupplier && (
              <button
                type="button"
                onClick={handleQuickAdd}
                className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b border-gray-200 flex items-center space-x-2 text-blue-600 font-medium"
              >
                <Plus size={16} />
                <span>Adicionar Novo Fornecedor</span>
              </button>
            )}

            {/* Suppliers List */}
            <div className="max-h-40 overflow-y-auto">
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers
                  .filter(supplier => supplier && supplier.id)
                  .map((supplier) => (
                  <button
                    key={supplier.id}
                    type="button"
                    onClick={() => handleSupplierSelect(supplier)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                      selectedSupplierId === supplier.id ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{supplier.name}</div>
                      {showSupplierDetails && (
                        <div className="text-xs text-gray-500 space-y-1 mt-1">
                          {supplier.contactPerson && (
                            <div className="flex items-center space-x-1">
                              <User size={12} />
                              <span className="truncate">{supplier.contactPerson}</span>
                            </div>
                          )}
                          {supplier.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone size={12} />
                              <span>{supplier.phone}</span>
                            </div>
                          )}
                          {supplier.email && (
                            <div className="flex items-center space-x-1">
                              <Mail size={12} />
                              <span className="truncate">{supplier.email}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedSupplierId === supplier.id && (
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-gray-500 text-sm">
                  {searchTerm ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor disponível'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Supplier Details */}
      {selectedSupplier && showSupplierDetails && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 space-y-1">
            {selectedSupplier.contactPerson && (
              <div className="flex items-center space-x-2">
                <User size={14} className="text-gray-400" />
                <span>{selectedSupplier.contactPerson}</span>
              </div>
            )}
            {selectedSupplier.phone && (
              <div className="flex items-center space-x-2">
                <Phone size={14} className="text-gray-400" />
                <span>{selectedSupplier.phone}</span>
              </div>
            )}
            {selectedSupplier.email && (
              <div className="flex items-center space-x-2">
                <Mail size={14} className="text-gray-400" />
                <span className="truncate">{selectedSupplier.email}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}

      {/* Overlay to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}

      {/* Quick Supplier Modal */}
      <QuickSupplierModal
        isOpen={isQuickModalOpen}
        onClose={() => setIsQuickModalOpen(false)}
        onSave={handleQuickSupplierSave}
      />
    </div>
  );
};

export default SupplierSelector;