import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Award, 
  TrendingUp, 
  Users, 
  Gift, 
  Star, 
  Crown, 
  Diamond, 
  Medal,
  Plus,
  Minus,
  History,
  Settings,
  BarChart3
} from 'lucide-react';
import { Customer, LoyaltyTransaction, LoyaltyLevel } from '../types';
import { mockLoyaltyProgram } from '../data/mockData';

interface LoyaltyManagerProps {
  customers: Customer[];
  loyaltyTransactions: LoyaltyTransaction[];
  onAddPoints: (customerId: string, points: number, description: string) => void;
  onRedeemPoints: (customerId: string, points: number, description: string) => void;
  customerStats: {
    totalCustomers: number;
    totalActiveCustomers: number;
    totalLoyaltyPoints: number;
    totalSpent: number;
    averageSpent: number;
    levelDistribution: Record<LoyaltyLevel, number>;
  };
}

const LoyaltyManager: React.FC<LoyaltyManagerProps> = ({
  customers,
  loyaltyTransactions,
  onAddPoints,
  onRedeemPoints,
  customerStats
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'customers' | 'settings'>('overview');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [pointsAction, setPointsAction] = useState<'add' | 'redeem' | null>(null);
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsDescription, setPointsDescription] = useState('');

  const getLevelIcon = (level: LoyaltyLevel) => {
    switch (level) {
      case 'bronze': return <Medal className="w-5 h-5 text-amber-600" />;
      case 'prata': return <Star className="w-5 h-5 text-gray-400" />;
      case 'ouro': return <Crown className="w-5 h-5 text-yellow-500" />;
      case 'diamante': return <Diamond className="w-5 h-5 text-blue-500" />;
    }
  };

  const getLevelColor = (level: LoyaltyLevel) => {
    switch (level) {
      case 'bronze': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'prata': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'ouro': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'diamante': return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const handlePointsAction = () => {
    if (!selectedCustomer || !pointsAmount || !pointsDescription) return;

    const points = parseInt(pointsAmount);
    if (isNaN(points) || points <= 0) return;

    try {
      if (pointsAction === 'add') {
        onAddPoints(selectedCustomer.id, points, pointsDescription);
      } else if (pointsAction === 'redeem') {
        onRedeemPoints(selectedCustomer.id, points, pointsDescription);
      }
      
      // Reset form
      setSelectedCustomer(null);
      setPointsAction(null);
      setPointsAmount('');
      setPointsDescription('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao processar pontos');
    }
  };

  const recentTransactions = loyaltyTransactions.slice(0, 10);
  const topCustomers = customers
    .filter(c => c.isActive)
    .sort((a, b) => b.loyaltyPoints - a.loyaltyPoints)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center space-x-3">
          <Award className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">{mockLoyaltyProgram.name}</h1>
            <p className="text-purple-100">Sistema de Fidelidade</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
            { id: 'transactions', label: 'Transações', icon: History },
            { id: 'customers', label: 'Clientes Top', icon: Users },
            { id: 'settings', label: 'Configurações', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Stats Cards */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Clientes</p>
                  <p className="text-2xl font-bold text-gray-900">{customerStats.totalActiveCustomers}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pontos Totais</p>
                  <p className="text-2xl font-bold text-gray-900">{customerStats.totalLoyaltyPoints.toLocaleString()}</p>
                </div>
                <Award className="w-8 h-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Faturamento Total</p>
                  <p className="text-2xl font-bold text-gray-900">R$ {customerStats.totalSpent.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
                  <p className="text-2xl font-bold text-gray-900">R$ {customerStats.averageSpent.toFixed(2)}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-orange-500" />
              </div>
            </div>

            {/* Level Distribution */}
            <div className="md:col-span-2 lg:col-span-4 bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Nível</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mockLoyaltyProgram.levels.map(level => (
                  <div key={level.level} className={`p-4 rounded-lg border ${getLevelColor(level.level)}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      {getLevelIcon(level.level)}
                      <span className="font-medium capitalize">{level.level}</span>
                    </div>
                    <p className="text-2xl font-bold">{customerStats.levelDistribution[level.level] || 0}</p>
                    <p className="text-sm opacity-75">{level.discount}% desconto</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const customer = customers.find(c => c.id === e.target.value);
                    setSelectedCustomer(customer || null);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Selecionar Cliente</option>
                  {customers.filter(c => c.isActive).map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.loyaltyPoints} pts)
                    </option>
                  ))}
                </select>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setPointsAction('add')}
                    disabled={!selectedCustomer}
                    className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar</span>
                  </button>
                  <button
                    onClick={() => setPointsAction('redeem')}
                    disabled={!selectedCustomer}
                    className="flex-1 flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4" />
                    <span>Resgatar</span>
                  </button>
                </div>
              </div>

              {pointsAction && selectedCustomer && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">
                    {pointsAction === 'add' ? 'Adicionar' : 'Resgatar'} Pontos - {selectedCustomer.name}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="number"
                      placeholder="Quantidade de pontos"
                      value={pointsAmount}
                      onChange={(e) => setPointsAmount(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Descrição"
                      value={pointsDescription}
                      onChange={(e) => setPointsDescription(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handlePointsAction}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => {
                          setPointsAction(null);
                          setPointsAmount('');
                          setPointsDescription('');
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Transações Recentes</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pontos</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentTransactions.map(transaction => {
                      const customer = customers.find(c => c.id === transaction.customerId);
                      return (
                        <tr key={transaction.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {customer?.name || 'Cliente não encontrado'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              transaction.type === 'earn' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.type === 'earn' ? 'Ganho' : 'Resgate'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.type === 'earn' ? '+' : '-'}{transaction.points}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {transaction.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.date.toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Top 5 Clientes por Pontos</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {topCustomers.map((customer, index) => (
                  <div key={customer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-500">{customer.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        {getLevelIcon(customer.loyaltyLevel)}
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getLevelColor(customer.loyaltyLevel)}`}>
                          {customer.loyaltyLevel?.toUpperCase() || 'BRONZE'}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{customer.loyaltyPoints} pts</p>
                      <p className="text-sm text-gray-500">R$ {customer.totalSpent.toFixed(2)} gastos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Configurações do Programa</h3>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Programa
                  </label>
                  <input
                    type="text"
                    value={mockLoyaltyProgram.name}
                    readOnly
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pontos por Real Gasto
                  </label>
                  <input
                    type="number"
                    value={mockLoyaltyProgram.pointsPerReal}
                    readOnly
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                  />
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Níveis de Fidelidade</h4>
                  <div className="space-y-4">
                    {mockLoyaltyProgram.levels.map(level => (
                      <div key={level.level} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          {getLevelIcon(level.level)}
                          <span className="font-medium capitalize">{level.level}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm text-gray-600">Pontos Mínimos</label>
                            <input
                              type="number"
                              value={level.minPoints}
                              readOnly
                              className="w-full border border-gray-300 rounded px-2 py-1 bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600">Desconto (%)</label>
                            <input
                              type="number"
                              value={level.discount}
                              readOnly
                              className="w-full border border-gray-300 rounded px-2 py-1 bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600">Benefícios</label>
                            <div className="text-sm text-gray-700">
                              {level.benefits.join(', ')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default LoyaltyManager;