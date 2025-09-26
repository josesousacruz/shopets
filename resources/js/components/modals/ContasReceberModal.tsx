import React, { useState } from 'react';
import { X, Save, DollarSign, Calendar, FileText } from 'lucide-react';
import { AccountReceivable, Customer, FinancialEntryStatus } from '../../types';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';

interface ContasReceberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (accountReceivable: Omit<AccountReceivable, 'id'>) => void;
  customer: Customer;
}

const ContasReceberModal: React.FC<ContasReceberModalProps> = ({ isOpen, onClose, onSave, customer }) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    dueDate: '',
    status: 'pending' as FinancialEntryStatus
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Data de vencimento é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const accountReceivableData: Omit<AccountReceivable, 'id'> = {
      description: formData.description,
      amount: parseFloat(formData.amount),
      dueDate: new Date(formData.dueDate),
      status: formData.status,
      customerId: customer.id
    };

    onSave(accountReceivableData);
    
    // Reset form
    setFormData({
      description: '',
      amount: '',
      dueDate: '',
      status: 'pending'
    });
    setErrors({});
    
    Swal.fire({
      icon: 'success',
      title: 'Conta a Receber Criada!',
      text: `Conta de R$ ${parseFloat(formData.amount).toFixed(2)} adicionada para ${customer.name}`,
      timer: 2000,
      showConfirmButton: false
    });
    
    onClose();
  };

  const handleClose = () => {
    setFormData({
      description: '',
      amount: '',
      dueDate: '',
      status: 'pending'
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-md"
      >
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">
              Nova Conta a Receber
            </h2>
            <button 
              onClick={handleClose} 
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Cliente: <span className="font-medium">{customer.name}</span>
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
              <input 
                type="text" 
                value={formData.description} 
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                className={`w-full pl-9 pr-3 py-2 border rounded-lg ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: Venda de produtos, Serviço prestado..."
              />
            </div>
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor (R$) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
              <input 
                type="number" 
                step="0.01"
                min="0.01"
                value={formData.amount} 
                onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
                className={`w-full pl-9 pr-3 py-2 border rounded-lg ${
                  errors.amount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0,00"
              />
            </div>
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data de Vencimento *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
              <input 
                type="date" 
                value={formData.dueDate} 
                onChange={(e) => setFormData(p => ({ ...p, dueDate: e.target.value }))}
                className={`w-full pl-9 pr-3 py-2 border rounded-lg ${
                  errors.dueDate ? 'border-red-500' : 'border-gray-300'
                }`}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            {errors.dueDate && <p className="text-red-500 text-xs mt-1">{errors.dueDate}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select 
              value={formData.status} 
              onChange={(e) => setFormData(p => ({ ...p, status: e.target.value as FinancialEntryStatus }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="overdue">Vencido</option>
            </select>
          </div>
        </form>

        <div className="p-6 border-t bg-gray-50 rounded-b-xl flex justify-end space-x-3">
          <button 
            type="button" 
            onClick={handleClose} 
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleSubmit} 
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 font-medium"
          >
            <Save size={16} />
            <span>Salvar</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ContasReceberModal;