import React, { useState } from 'react';
import { Plus, CheckCircle, AlertTriangle, Clock, DollarSign, Search, Filter, Eye, Edit, Trash2 } from 'lucide-react';
import { AccountReceivable, Customer, FinancialEntryStatus } from '../../types';
import { router } from '@inertiajs/react';

interface ContasReceberProps {
  accounts: AccountReceivable[];
  customers: Customer[];
  onUpdateStatus: (id: number, type: 'payable' | 'receivable') => void;
  onAdd: () => void;
}

const getStatusBadge = (status: FinancialEntryStatus) => {
  const styles = {
    pendente: 'bg-yellow-100 text-yellow-800',
    pago: 'bg-green-100 text-green-800',
    vencido: 'bg-red-100 text-red-800',
    cancelado: 'bg-gray-100 text-gray-800',
  };
  const text = {
    pendente: 'Pendente',
    pago: 'Recebido',
    vencido: 'Vencido',
    cancelado: 'Cancelado',
  };
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>{text[status]}</span>;
};

const ContasReceber: React.FC<ContasReceberProps> = ({ accounts, customers, onUpdateStatus, onAdd }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FinancialEntryStatus | 'all'>('all');
  
  const customerMap = new Map(customers.map(c => [c.id_cliente, c.nome]));

  // Filtrar contas
  const filteredAccounts = accounts.filter(account => {
    const searchLower = searchTerm.toLowerCase();
    const descricao = account.descricao || '';
    const numeroDoc = account.numero_documento || '';
    const customerName = customerMap.get(account.id_cliente) || '';
    
    const matchesSearch = descricao.toLowerCase().includes(searchLower) ||
                         numeroDoc.toLowerCase().includes(searchLower) ||
                         customerName.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'all' || account.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calcular totais com verificação de valores válidos
  const totalPendente = accounts
    .filter(acc => acc.status === 'pendente')
    .reduce((sum, acc) => sum + (acc.valor_original || 0), 0);
    
  const totalVencido = accounts
    .filter(acc => acc.status === 'vencido')
    .reduce((sum, acc) => sum + (acc.valor_original || 0), 0);
    
  const totalRecebido = accounts
    .filter(acc => acc.status === 'pago')
    .reduce((sum, acc) => sum + (acc.valor_recebido || 0), 0);
    
  const totalGeral = accounts
    .reduce((sum, acc) => sum + (acc.valor_original || 0), 0);

  const handleView = (id: number) => {
    router.visit(route('contas-receber.show', id));
  };

  const handleEdit = (id: number) => {
    router.visit(route('contas-receber.edit', id));
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta conta?')) {
      router.delete(route('contas-receber.destroy', id));
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

  const formatDate = (dateString: string | null | undefined) => {
    // Verificar se a data é válida
    if (!dateString) {
      return 'Data não informada';
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="bg-white rounded-xl shadow-md">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-semibold">Contas a Receber</h3>
        <button 
          onClick={onAdd} 
          className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 text-sm"
        >
          <Plus size={16} />
          <span>Nova Conta</span>
        </button>
      </div>
      
      {/* Cards de Indicadores */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Vencido</p>
              <p className="text-2xl font-bold text-red-700">{formatCurrency(totalVencido)}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Pendente</p>
              <p className="text-2xl font-bold text-yellow-700">{formatCurrency(totalPendente)}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Recebido</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(totalRecebido)}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalGeral)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por descrição, documento ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FinancialEntryStatus | 'all')}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os Status</option>
              <option value="pendente">Pendente</option>
              <option value="vencido">Vencido</option>
              <option value="pago">Recebido</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Contas */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Documento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descrição
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vencimento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAccounts.map((account) => (
              <tr key={account.id_conta_receber} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {account.numero_documento || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="max-w-xs truncate" title={account.descricao}>
                    {account.descricao}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {customerMap.get(account.id_cliente) || (
                    <span className="text-gray-400 italic">Cliente não informado</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>
                    <div className="font-medium">{formatCurrency(account.valor_original)}</div>
                    {account.valor_recebido > 0 && (
                      <div className="text-xs text-green-600">
                        Recebido: {formatCurrency(account.valor_recebido)}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(account.data_vencimento)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(account.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleView(account.id_conta_receber)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Visualizar"
                    >
                      <Eye size={16} />
                    </button>
                    {account.status !== 'pago' && account.status !== 'cancelado' && (
                      <>
                        <button
                          onClick={() => handleEdit(account.id_conta_receber)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => onUpdateStatus(account.id_conta_receber, 'receivable')}
                          className="text-green-600 hover:text-green-900"
                          title="Marcar como Recebido"
                        >
                          <CheckCircle size={16} />
                        </button>
                      </>
                    )}
                    {account.status !== 'pago' && (
                      <button
                        onClick={() => handleDelete(account.id_conta_receber)}
                        className="text-red-600 hover:text-red-900"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredAccounts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhuma conta a receber encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContasReceber;
