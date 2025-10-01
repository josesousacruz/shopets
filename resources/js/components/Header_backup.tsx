import React, { useState } from 'react';
import { ShoppingCart, Package, BarChart3, Truck, Users, Landmark, User, LogOut, Menu, X } from 'lucide-react';
import { Operator } from '../types';

interface HeaderProps {
  currentView: string;
  onViewChange: (view: 'pdv' | 'estoque' | 'relatorios' | 'fornecedores' | 'clientes' | 'financeiro') => void;
  cartItemCount: number;
  currentOperator?: Operator | null;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onViewChange, cartItemCount, currentOperator, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
    <header className="bg-blue-600 text-white shadow-lg sticky top-0 z-40">
      <div className="px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-shrink">
            <img src="/src/img/logo.png" alt="ShopPet" className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <h1 className="text-xs sm:text-lg font-bold truncate">ShopPet PDV</h1>
              {currentOperator && (
                <div className="flex items-center space-x-1 text-xs text-blue-100">
                  <User className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{currentOperator.name}</span>
                  <span className="text-blue-200 hidden sm:inline">({currentOperator.role === 'admin' ? 'Admin' : currentOperator.role === 'manager' ? 'Gerente' : 'Operador'})</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            {/* Mobile Menu Button */}
            <div className="sm:hidden">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="text-blue-100 hover:bg-blue-500 p-2 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden sm:flex space-x-1 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => onViewChange('pdv')}
              className={`flex flex-col items-center px-1 sm:px-2 py-1 rounded-lg text-xs transition-colors flex-shrink-0 ${
                currentView === 'pdv'
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-500'
              }`}
            >
              <div className="relative">
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] rounded-full w-3 h-3 flex items-center justify-center font-bold">
                    {cartItemCount > 9 ? '9+' : cartItemCount}
                  </span>
                )}
              </div>
              <span className="mt-0.5 text-[10px] sm:text-xs hidden sm:block">PDV</span>
            </button>
            
            <button
              onClick={() => onViewChange('estoque')}
              className={`flex flex-col items-center px-1 sm:px-2 py-1 rounded-lg text-xs transition-colors flex-shrink-0 ${
                currentView === 'estoque'
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-500'
              }`}
            >
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="mt-0.5 text-[10px] sm:text-xs hidden sm:block">Estoque</span>
            </button>
            
            <button
              onClick={() => onViewChange('fornecedores')}
              className={`flex flex-col items-center px-1 sm:px-2 py-1 rounded-lg text-xs transition-colors flex-shrink-0 ${
                currentView === 'fornecedores'
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-500'
              }`}
            >
              <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="mt-0.5 text-[10px] sm:text-xs hidden sm:block">Fornec.</span>
            </button>

            <button
              onClick={() => onViewChange('clientes')}
              className={`flex flex-col items-center px-1 sm:px-2 py-1 rounded-lg text-xs transition-colors flex-shrink-0 ${
                currentView === 'clientes'
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-500'
              }`}
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="mt-0.5 text-[10px] sm:text-xs hidden sm:block">Clientes</span>
            </button>

            <button
              onClick={() => onViewChange('financeiro')}
              className={`flex flex-col items-center px-1 sm:px-2 py-1 rounded-lg text-xs transition-colors flex-shrink-0 ${
                currentView === 'financeiro'
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-500'
              }`}
            >
              <Landmark className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="mt-0.5 text-[10px] sm:text-xs hidden sm:block">Financ.</span>
            </button>

            <button
              onClick={() => onViewChange('relatorios')}
              className={`flex flex-col items-center px-1 sm:px-2 py-1 rounded-lg text-xs transition-colors flex-shrink-0 ${
                currentView === 'relatorios'
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-500'
              }`}
            >
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="mt-0.5 text-[10px] sm:text-xs hidden sm:block">Relatórios</span>
            </button>
          </nav>
          
          {/* Botão de Logout */}
          {currentOperator && onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center space-x-1 px-1 sm:px-2 py-1 rounded-lg text-xs transition-colors text-blue-100 hover:bg-blue-500 hover:text-white flex-shrink-0"
              title="Sair"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden md:block text-[10px] sm:text-xs">Sair</span>
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed top-0 left-0 h-full w-64 bg-blue-800 z-50 sm:hidden transform transition-transform duration-300">
            <div className="flex items-center justify-between p-4 border-b border-blue-700">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 flex items-center justify-center text-blue-600 font-bold text-xs">
                SP
              </div>
                <span className="text-white font-semibold">ShopPet PDV</span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="text-blue-100 hover:bg-blue-600/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="p-4">
              <div className="space-y-2">
                <button
                  onClick={() => {
                    onViewChange('pdv');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    currentView === 'pdv'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-100 hover:bg-blue-600/20'
                  }`}
                >
                  <div className="relative">
                    <ShoppingCart className="w-5 h-5" />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                        {cartItemCount > 9 ? '9+' : cartItemCount}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium">PDV</span>
                </button>
                
                <button
                  onClick={() => {
                    onViewChange('estoque');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    currentView === 'estoque'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-100 hover:bg-blue-600/20'
                  }`}
                >
                  <Package className="w-5 h-5" />
                  <span className="text-sm font-medium">Estoque</span>
                </button>
                
                <button
                  onClick={() => {
                    onViewChange('fornecedores');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    currentView === 'fornecedores'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-100 hover:bg-blue-600/20'
                  }`}
                >
                  <Truck className="w-5 h-5" />
                  <span className="text-sm font-medium">Fornecedores</span>
                </button>
                
                <button
                  onClick={() => {
                    onViewChange('clientes');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    currentView === 'clientes'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-100 hover:bg-blue-600/20'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span className="text-sm font-medium">Clientes</span>
                </button>
                
                <button
                  onClick={() => {
                    onViewChange('financeiro');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    currentView === 'financeiro'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-100 hover:bg-blue-600/20'
                  }`}
                >
                  <Landmark className="w-5 h-5" />
                  <span className="text-sm font-medium">Financeiro</span>
                </button>
                
                <button
                  onClick={() => {
                    onViewChange('relatorios');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    currentView === 'relatorios'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-100 hover:bg-blue-600/20'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-sm font-medium">Relatórios</span>
                </button>
              </div>
              
              {currentOperator && (
                <div className="mt-8 pt-4 border-t border-blue-700">
                  <div className="flex items-center space-x-3 px-4 py-2 text-blue-100">
                    <User className="w-5 h-5" />
                    <span className="text-sm">{currentOperator.name}</span>
                  </div>
                  
                  {onLogout && (
                    <button
                      onClick={() => {
                        onLogout();
                        setIsSidebarOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-blue-100 hover:bg-blue-600/20 mt-2"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="text-sm font-medium">Sair</span>
                    </button>
                  )}
                </div>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  );
};

export default Header;