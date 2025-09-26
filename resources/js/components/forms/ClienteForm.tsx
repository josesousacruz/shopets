import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, Mail, MapPin, Calendar, CreditCard, Star, Award, Receipt } from 'lucide-react';
import { Customer, LoyaltyProgram, LoyaltyLevel, AccountReceivable } from '../../types';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import ContasReceberModal from '../modals/ContasReceberModal';

interface ClienteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Omit<Customer, 'id'>) => void;
  customer?: Customer;
  loyaltyProgram: LoyaltyProgram;
  onAddAccountReceivable?: (accountReceivable: Omit<AccountReceivable, 'id'>) => void;
  accountsReceivable?: AccountReceivable[];
}

const initialFormData = {
  name: '',
  phone: '',
  email: '',
  address: '',
  birthDate: '',
  cpf: '',
  loyaltyPoints: 0,
  loyaltyLevel: 'bronze' as LoyaltyLevel,
  totalSpent: 0,
  isActive: true,
};

const ClienteForm: React.FC<ClienteFormProps> = ({ isOpen, onClose, onSave, customer, loyaltyProgram, onAddAccountReceivable, accountsReceivable = [] }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isContasReceberModalOpen, setIsContasReceberModalOpen] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
        birthDate: customer.birthDate ? customer.birthDate.toISOString().split('T')[0] : '',
        cpf: customer.cpf || '',
        loyaltyPoints: customer.loyaltyPoints,
        loyaltyLevel: customer.loyaltyLevel,
        totalSpent: customer.totalSpent,
        isActive: customer.isActive,
      });
    } else {
      setFormData({
        ...initialFormData,
        loyaltyLevel: 'bronze',
        loyaltyPoints: 0,
        totalSpent: 0,
        isActive: true,
      });
    }
    setErrors({});
  }, [customer, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
    } else if (!/^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Telefone inválido';
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (formData.cpf && !/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(formData.cpf.replace(/\D/g, ''))) {
      newErrors.cpf = 'CPF inválido';
    }
    
    if (formData.loyaltyPoints < 0) {
      newErrors.loyaltyPoints = 'Pontos não podem ser negativos';
    }
    
    if (formData.totalSpent < 0) {
      newErrors.totalSpent = 'Total gasto não pode ser negativo';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    const customerData = {
      ...formData,
      birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined,
      createdAt: customer?.createdAt || new Date(),
      lastPurchase: customer?.lastPurchase,
    };
    
    onSave(customerData);
    
    Swal.fire({
      title: 'Sucesso!',
      text: `Cliente ${customer ? 'atualizado' : 'cadastrado'} com sucesso!`,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const getLoyaltyLevelInfo = (level: LoyaltyLevel) => {
    return loyaltyProgram.levels.find(l => l.level === level) || loyaltyProgram.levels[0];
  };

  const getLoyaltyLevelColor = (level: LoyaltyLevel) => {
    const colors = {
      bronze: 'bg-amber-100 text-amber-800 border-amber-200',
      prata: 'bg-gray-100 text-gray-800 border-gray-200',
      ouro: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      diamante: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[level] || colors.bronze;
  };

  const getLoyaltyLevelIcon = (level: LoyaltyLevel) => {
    switch (level) {
      case 'diamante': return <Award size={16} />;
      case 'ouro': return <Star size={16} />;
      case 'prata': return <CreditCard size={16} />;
      default: return <User size={16} />;
    }
  };

  if (!isOpen) return null;

  const currentLevelInfo = getLoyaltyLevelInfo(formData.loyaltyLevel);

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
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-gray-800">
                {customer ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              {customer && onAddAccountReceivable && (
                <button
                  type="button"
                  onClick={() => setIsContasReceberModalOpen(true)}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center space-x-1.5 font-medium transition-colors"
                >
                  <Receipt size={16} />
                  <span>Contas a Receber</span>
                </button>
              )}
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna 1: Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Informações Básicas</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    className={`w-full pl-9 pr-3 py-2 border rounded-lg ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Digite o nome completo"
                  />
                </div>
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                  <input 
                    type="tel" 
                    value={formData.phone} 
                    onChange={(e) => setFormData(p => ({ ...p, phone: formatPhone(e.target.value) }))}
                    className={`w-full pl-9 pr-3 py-2 border rounded-lg ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                  <input 
                    type="email" 
                    value={formData.email} 
                    onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                    className={`w-full pl-9 pr-3 py-2 border rounded-lg ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="email@exemplo.com"
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                  <input 
                    type="text" 
                    value={formData.cpf} 
                    onChange={(e) => setFormData(p => ({ ...p, cpf: formatCPF(e.target.value) }))}
                    className={`w-full pl-9 pr-3 py-2 border rounded-lg ${
                      errors.cpf ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
                {errors.cpf && <p className="text-red-500 text-xs mt-1">{errors.cpf}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                  <input 
                    type="date" 
                    value={formData.birthDate} 
                    onChange={(e) => setFormData(p => ({ ...p, birthDate: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg border-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* Coluna 2: Endereço e Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Endereço e Status</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400" size={16}/>
                  <textarea 
                    value={formData.address} 
                    onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
                    rows={3}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg border-gray-300"
                    placeholder="Rua, número, bairro, cidade, CEP"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status do Cliente</label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="isActive" 
                      checked={formData.isActive} 
                      onChange={() => setFormData(p => ({ ...p, isActive: true }))}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-green-600 font-medium">Ativo</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="isActive" 
                      checked={!formData.isActive} 
                      onChange={() => setFormData(p => ({ ...p, isActive: false }))}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-red-600 font-medium">Inativo</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Coluna 3: Programa de Fidelidade */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Programa de Fidelidade</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Fidelidade</label>
                <select 
                  value={formData.loyaltyLevel} 
                  onChange={(e) => setFormData(p => ({ ...p, loyaltyLevel: e.target.value as LoyaltyLevel }))}
                  className="w-full px-3 py-2 border rounded-lg border-gray-300"
                >
                  {loyaltyProgram.levels.map(level => (
                    <option key={level.level} value={level.level}>
                      {level.level?.toUpperCase() || 'BRONZE'} - {level.discount}% desconto
                    </option>
                  ))}
                </select>
                
                <div className={`mt-2 p-3 rounded-lg border ${getLoyaltyLevelColor(formData.loyaltyLevel)}`}>
                  <div className="flex items-center space-x-2">
                    {getLoyaltyLevelIcon(formData.loyaltyLevel)}
                    <span className="font-medium">{formData.loyaltyLevel?.toUpperCase() || 'BRONZE'}</span>
                  </div>
                  <p className="text-xs mt-1">Desconto: {currentLevelInfo.discount}%</p>
                  <p className="text-xs">Mínimo: {currentLevelInfo.minPoints} pontos</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pontos de Fidelidade</label>
                <input 
                  type="number" 
                  value={formData.loyaltyPoints} 
                  onChange={(e) => setFormData(p => ({ ...p, loyaltyPoints: parseInt(e.target.value) || 0 }))}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errors.loyaltyPoints ? 'border-red-500' : 'border-gray-300'
                  }`}
                  min="0"
                  placeholder="0"
                />
                {errors.loyaltyPoints && <p className="text-red-500 text-xs mt-1">{errors.loyaltyPoints}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Gasto (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={formData.totalSpent} 
                  onChange={(e) => setFormData(p => ({ ...p, totalSpent: parseFloat(e.target.value) || 0 }))}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errors.totalSpent ? 'border-red-500' : 'border-gray-300'
                  }`}
                  min="0"
                  placeholder="0.00"
                />
                {errors.totalSpent && <p className="text-red-500 text-xs mt-1">{errors.totalSpent}</p>}
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Benefícios do Nível Atual:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  {currentLevelInfo.benefits.map((benefit, index) => (
                    <li key={index}>• {benefit}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          {/* Histórico de Contas a Receber (abaixo do formulário) */}
          {customer && (() => {
            const customerAccounts = accountsReceivable.filter(acc => acc.customerId === customer.id);
            
            if (customerAccounts.length === 0) {
              return (
                <div className="px-6 pb-6">
                  <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">Histórico de Contas a Receber</h3>
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <Receipt size={48} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma conta a receber encontrada</p>
                  </div>
                </div>
              );
            }
            
            const getStatusBadge = (status: string) => {
              const styles = {
                pending: 'bg-yellow-100 text-yellow-800',
                paid: 'bg-green-100 text-green-800',
                overdue: 'bg-red-100 text-red-800',
              };
              const text = {
                pending: 'Pendente',
                paid: 'Recebido',
                overdue: 'Vencido',
              };
              return (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles] || styles.pending}`}>
                  {text[status as keyof typeof text] || 'Pendente'}
                </span>
              );
            };
            
            const totalPendente = customerAccounts.filter(acc => acc.status === 'pending').reduce((sum, acc) => sum + acc.amount, 0);
            const totalPago = customerAccounts.filter(acc => acc.status === 'paid').reduce((sum, acc) => sum + acc.amount, 0);
            const totalAtrasado = customerAccounts.filter(acc => {
              const today = new Date();
              const dueDate = new Date(acc.dueDate);
              return acc.status === 'pending' && dueDate < today;
            }).reduce((sum, acc) => sum + acc.amount, 0);
            
            return (
              <div className="px-6 pb-6">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">Histórico de Contas a Receber</h3>
                
                {/* Cards de Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-600">Pendentes</p>
                        <p className="text-2xl font-bold text-yellow-700">R$ {totalPendente.toFixed(2)}</p>
                      </div>
                      <div className="bg-yellow-100 p-2 rounded-full">
                        <Receipt size={24} className="text-yellow-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Pago</p>
                        <p className="text-2xl font-bold text-green-700">R$ {totalPago.toFixed(2)}</p>
                      </div>
                      <div className="bg-green-100 p-2 rounded-full">
                        <Receipt size={24} className="text-green-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-600">Atrasado</p>
                        <p className="text-2xl font-bold text-red-700">R$ {totalAtrasado.toFixed(2)}</p>
                      </div>
                      <div className="bg-red-100 p-2 rounded-full">
                        <Receipt size={24} className="text-red-600" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {customerAccounts.map(acc => (
                          <tr key={acc.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800">{acc.description}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{new Date(acc.dueDate).toLocaleDateString('pt-BR')}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">R$ {acc.amount.toFixed(2)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(acc.status)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {acc.status !== 'paid' && (
                                <button className="text-green-600 hover:text-green-800 p-1" title="Marcar como recebido">
                                  <Receipt size={18} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </form>

        <div className="p-6 border-t bg-gray-50 rounded-b-xl flex justify-end space-x-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleSubmit} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 font-medium"
          >
            <Save size={16} />
            <span>{customer ? 'Atualizar' : 'Salvar'}</span>
          </button>
        </div>
      </motion.div>
      
      {/* Modal de Contas a Receber */}
      {customer && onAddAccountReceivable && (
        <ContasReceberModal
          isOpen={isContasReceberModalOpen}
          onClose={() => setIsContasReceberModalOpen(false)}
          onSave={onAddAccountReceivable}
          customer={customer}
        />
      )}
    </motion.div>
  );
};

export default ClienteForm;