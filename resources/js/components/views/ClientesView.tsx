import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit, Users, User, Phone, Mail, MapPin, Star, Award, Calendar, CreditCard } from 'lucide-react';
import { Customer, LoyaltyTransaction, LoyaltyProgram, AccountReceivable } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import ClienteForm from '../forms/ClienteForm';

interface ClientesViewProps {
  customers: Customer[];
  loyaltyProgram: LoyaltyProgram;
  loyaltyTransactions: LoyaltyTransaction[];
  onAddCustomer: (customer: Omit<Customer, 'id'>) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onAddLoyaltyTransaction: (transaction: Omit<LoyaltyTransaction, 'id'>) => void;
  onAddAccountReceivable?: (accountReceivable: Omit<AccountReceivable, 'id'>) => void;
  accountsReceivable?: AccountReceivable[];
}

const ClientesView: React.FC<ClientesViewProps> = ({ 
  customers, 
  loyaltyProgram, 
  loyaltyTransactions, 
  onAddCustomer, 
  onUpdateCustomer, 
  onAddLoyaltyTransaction,
  onAddAccountReceivable,
  accountsReceivable = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>();
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    if (searchTerm.trim()) {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(customer => 
        customer.name.toLowerCase().includes(lowercasedSearchTerm) ||
        customer.phone.includes(searchTerm) ||
        customer.email?.toLowerCase().includes(lowercasedSearchTerm) ||
        customer.cpf?.includes(searchTerm)
      );
    }

    if (filterLevel !== 'all') {
      filtered = filtered.filter(customer => customer.loyaltyLevel === filterLevel);
    }

    return filtered.sort((a, b) => b.loyaltyPoints - a.loyaltyPoints);
  }, [customers, searchTerm, filterLevel]);

  const handleNewCustomer = () => {
    setEditingCustomer(undefined);
    setIsFormOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleSaveCustomer = (customerData: Omit<Customer, 'id'>) => {
    if (editingCustomer) {
      onUpdateCustomer({ ...customerData, id: editingCustomer.id });
    } else {
      onAddCustomer(customerData);
    }
    setIsFormOpen(false);
  };

  const getLoyaltyLevelInfo = (level: string) => {
    const levelInfo = loyaltyProgram.levels.find(l => l.level === level);
    return levelInfo || { level: 'bronze', minPoints: 0, discount: 0, benefits: [] };
  };

  const getLoyaltyLevelColor = (level: string) => {
    const colors = {
      bronze: 'bg-amber-100 text-amber-800',
      prata: 'bg-gray-100 text-gray-800',
      ouro: 'bg-yellow-100 text-yellow-800',
      diamante: 'bg-blue-100 text-blue-800'
    };
    return colors[level as keyof typeof colors] || colors.bronze;
  };

  const getLoyaltyLevelIcon = (level: string) => {
    switch (level) {
      case 'diamante': return <Award size={14} className="mr-1" />;
      case 'ouro': return <Star size={14} className="mr-1" />;
      case 'prata': return <CreditCard size={14} className="mr-1" />;
      default: return <User size={14} className="mr-1" />;
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    // Verificar se o valor é válido
    if (value === null || value === undefined || isNaN(value)) {
      return 'R$ 0,00';
    }
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: Date | null | undefined) => {
    // Verificar se a data é válida
    if (!date) {
      return 'Data não informada';
    }
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida';
    }
    
    return dateObj.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Clientes</p>
              <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clientes Ativos</p>
              <p className="text-2xl font-bold text-green-600">{customers.filter(c => c.isActive).length}</p>
            </div>
            <User className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pontos Totais</p>
              <p className="text-2xl font-bold text-purple-600">
                {customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0).toLocaleString()}
              </p>
            </div>
            <Star className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Gasto</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0))}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Faturamento Total</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0))}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Filtros e busca */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome, telefone, email ou CPF..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          
          <select 
            value={filterLevel} 
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os níveis</option>
            <option value="bronze">Bronze</option>
            <option value="prata">Prata</option>
            <option value="ouro">Ouro</option>
            <option value="diamante">Diamante</option>
          </select>
          
          <button 
            onClick={handleNewCustomer} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
          >
            <Plus size={20} />
            <span className="font-medium">Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Lista de clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredCustomers.map(customer => {
            const levelInfo = getLoyaltyLevelInfo(customer.loyaltyLevel);
            return (
              <motion.div
                key={customer.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl shadow-lg border border-gray-200/80 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col"
              >
                <div className="p-5 border-b border-gray-200/80">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 truncate">{customer.name}</h3>
                      <div className="flex items-center mt-2">
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${getLoyaltyLevelColor(customer.loyaltyLevel)}`}>
                          {getLoyaltyLevelIcon(customer.loyaltyLevel)}
                          {customer.loyaltyLevel?.toUpperCase() || 'BRONZE'}
                        </span>
                        {!customer.isActive && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            Inativo
                          </span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleEditCustomer(customer)} 
                      className="text-gray-400 hover:text-blue-600 p-1 rounded-full transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-3 flex-grow">
                  <div className="flex items-center space-x-3 text-sm">
                    <Phone size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">{customer.phone}</span>
                  </div>
                  
                  {customer.email && (
                    <div className="flex items-center space-x-3 text-sm">
                      <Mail size={16} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-700 truncate">{customer.email}</span>
                    </div>
                  )}
                  
                  {customer.address && (
                    <div className="flex items-start space-x-3 text-sm">
                      <MapPin size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{customer.address}</span>
                    </div>
                  )}
                  
                  {customer.lastPurchase && (
                    <div className="flex items-center space-x-3 text-sm">
                      <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-700">Última compra: {formatDate(customer.lastPurchase)}</span>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50/70 px-5 py-4 border-t border-gray-200/80">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pontos</p>
                      <p className="text-lg font-bold text-purple-600">{customer.loyaltyPoints.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Gasto</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(customer.totalSpent)}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Desconto Atual</p>
                    <p className="text-sm font-medium text-blue-600">{levelInfo.discount}% de desconto</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-16">
          <Users size={48} className="mx-auto text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-800">Nenhum cliente encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">Tente ajustar sua busca ou adicione um novo cliente.</p>
        </div>
      )}

      <ClienteForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSave={handleSaveCustomer} 
        customer={editingCustomer}
        loyaltyProgram={loyaltyProgram}
        onAddAccountReceivable={onAddAccountReceivable}
        accountsReceivable={accountsReceivable}
      />
    </div>
  );
};

export default ClientesView;