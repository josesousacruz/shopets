import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, User, Phone, Mail, MapPin, Search, History, FileText } from 'lucide-react';
import { Supplier, Product } from '../../types';
import { motion } from 'framer-motion';
import { PurchaseHistory } from '../PurchaseHistory';

interface FornecedorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: Omit<Supplier, 'id'>) => void;
  supplier?: Supplier;
  allProducts: Product[];
}

const initialFormData = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  productIds: [] as string[],
};

const FornecedorForm: React.FC<FornecedorFormProps> = ({ isOpen, onClose, onSave, supplier, allProducts }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [productSearch, setProductSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        contactPerson: supplier.contactPerson || '',
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address || '',
        productIds: supplier.productIds || [],
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
    setProductSearch('');
  }, [supplier, isOpen]);

  const filteredProducts = useMemo(() => 
    allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
  , [allProducts, productSearch]);

  const handleProductToggle = (productId: string) => {
    setFormData(prev => {
      const newProductIds = prev.productIds.includes(productId)
        ? prev.productIds.filter(id => id !== productId)
        : [...prev.productIds, productId];
      return { ...prev, productIds: newProductIds };
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.phone.trim()) newErrors.phone = 'Telefone é obrigatório';
    if (!formData.email.trim()) newErrors.email = 'Email é obrigatório';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b bg-blue-600 text-white rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
            <div className="flex items-center space-x-2">
              {supplier && supplier.purchaseHistory && supplier.purchaseHistory.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-white hover:bg-blue-700 p-2 rounded-lg transition-colors flex items-center space-x-1"
                  title="Ver Histórico de Compras"
                >
                  <History size={16} />
                  <span className="text-sm">Histórico</span>
                </button>
              )}
              <button onClick={onClose} className="text-white hover:bg-blue-700 p-1 rounded-full transition-colors"><X size={20} /></button>
            </div>
          </div>
        </div>
        
        {!showHistory ? (
          <form className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              {/* Left Column: Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Fornecedor *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} className={`w-full px-3 py-2 border rounded-lg ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contato</label>
                  <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input type="text" value={formData.contactPerson} onChange={(e) => setFormData(p => ({ ...p, contactPerson: e.target.value }))} className="w-full pl-9 pr-3 py-2 border rounded-lg border-gray-300" /></div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
                  <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} className={`w-full pl-9 pr-3 py-2 border rounded-lg ${errors.phone ? 'border-red-500' : 'border-gray-300'}`} /></div>
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} className={`w-full pl-9 pr-3 py-2 border rounded-lg ${errors.email ? 'border-red-500' : 'border-gray-300'}`} /></div>
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                  <div className="relative"><MapPin className="absolute left-3 top-3 text-gray-400" size={16}/><textarea value={formData.address} onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))} rows={2} className="w-full pl-9 pr-3 py-2 border rounded-lg border-gray-300" /></div>
                </div>
              </div>

              {/* Right Column: Product Selection */}
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1">Produtos Fornecidos</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                  <input type="text" placeholder="Buscar produto..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg border-gray-300"/>
                </div>
                <div className="flex-1 border rounded-lg overflow-y-auto p-2 bg-gray-50 space-y-1">
                  {filteredProducts.map(product => (
                    <label key={product.id} className="flex items-center p-2 rounded-md hover:bg-blue-100 cursor-pointer transition-colors">
                      <input type="checkbox" checked={formData.productIds.includes(product.id)} onChange={() => handleProductToggle(product.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="ml-3 text-sm text-gray-700">{product.name}</span>
                    </label>
                  ))}
                  {filteredProducts.length === 0 && <p className="text-center text-sm text-gray-500 p-4">Nenhum produto encontrado.</p>}
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <PurchaseHistory 
              purchases={supplier?.purchaseHistory || []} 
              supplierName={supplier?.name || ''} 
            />
          </div>
        )}

        <div className="p-6 border-t bg-gray-50 rounded-b-xl flex justify-end space-x-3">
          {showHistory ? (
            <button type="button" onClick={() => setShowHistory(false)} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Voltar</button>
          ) : (
            <>
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium">Cancelar</button>
              <button type="button" onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 font-medium"><Save size={16} /><span>{supplier ? 'Atualizar' : 'Salvar'}</span></button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FornecedorForm;
