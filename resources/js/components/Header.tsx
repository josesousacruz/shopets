import React, { useState } from 'react';
import { ShoppingCart, Package, BarChart3, Truck, Users, Landmark, User, LogOut, Menu, X, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

  const navigationItems = [
    { id: 'pdv', label: 'PDV', icon: ShoppingCart, color: 'from-green-500 to-emerald-600' },
    { id: 'estoque', label: 'Estoque', icon: Package, color: 'from-blue-500 to-blue-600' },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3, color: 'from-purple-500 to-purple-600' },
    { id: 'fornecedores', label: 'Fornecedores', icon: Truck, color: 'from-orange-500 to-orange-600' },
    { id: 'clientes', label: 'Clientes', icon: Users, color: 'from-pink-500 to-pink-600' },
    { id: 'financeiro', label: 'Financeiro', icon: Landmark, color: 'from-yellow-500 to-yellow-600' },
  ];

  return (
    <>
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white shadow-2xl sticky top-0 z-50 border-b border-blue-800/50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo e Info do Operador */}
            <motion.div 
              className="flex items-center space-x-3 min-w-0 flex-shrink"
              initial={{ opacity: 0.6, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                <img src="/src/img/logo.png" alt="ShopPet" className="w-10 h-10 rounded-lg shadow-lg" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  SHOPETS PDV
                </h1>
                {currentOperator && (
                  <div className="flex items-center space-x-2 text-sm text-blue-200">
                    <User className="w-4 h-4" />
                    <span className="truncate">{currentOperator.name}</span>
                    <span className="px-2 py-0.5 bg-blue-700/50 rounded-full text-xs">
                      {currentOperator.role === 'admin' ? 'Admin' : currentOperator.role === 'manager' ? 'Gerente' : 'Operador'}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
            
            {/* Navegação Desktop */}
            <motion.nav 
              className="hidden lg:flex items-center space-x-2"
              initial={{ opacity: 0.6, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {navigationItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => onViewChange(item.id as any)}
                    className={`relative group flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-white/20 backdrop-blur-sm shadow-lg'
                        : 'hover:bg-white/10 backdrop-blur-sm'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div className={`relative p-2 rounded-lg bg-gradient-to-br ${item.color} shadow-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                      {item.id === 'pdv' && cartItemCount > 0 && (
                        <motion.span 
                          className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          {cartItemCount > 9 ? '9+' : cartItemCount}
                        </motion.span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-white group-hover:text-blue-100 transition-colors">
                      {item.label}
                    </span>
                    
                    {isActive && (
                      <motion.div
                        className="absolute bottom-0 left-1/2 w-8 h-1 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"
                        layoutId="activeTab"
                        initial={{ opacity: 0.7 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15 }}
                        style={{ transform: 'translateX(-50%)' }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </motion.nav>

            {/* Menu Mobile */}
            <div className="lg:hidden flex items-center space-x-2">
              <motion.button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Menu className="w-6 h-6" />
              </motion.button>
            </div>

            {/* Botão de Logout */}
            <motion.button
              onClick={onLogout}
              className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-all duration-300 backdrop-blur-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium hidden xl:block">Sair</span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Sidebar Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.div
              className="fixed top-0 right-0 h-full w-80 bg-gradient-to-b from-slate-900 to-blue-900 shadow-2xl z-50 lg:hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold text-white">Menu</h2>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>

                <nav className="space-y-3">
                  {navigationItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    
                    return (
                      <motion.button
                        key={item.id}
                        onClick={() => {
                          onViewChange(item.id as any);
                          setIsSidebarOpen(false);
                        }}
                        className={`w-full flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 ${
                          isActive
                            ? 'bg-white/20 backdrop-blur-sm shadow-lg'
                            : 'hover:bg-white/10'
                        }`}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className={`p-3 rounded-lg bg-gradient-to-br ${item.color} shadow-lg`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <span className="text-white font-medium">{item.label}</span>
                          {item.id === 'pdv' && cartItemCount > 0 && (
                            <div className="text-sm text-blue-200 mt-1">
                              {cartItemCount} {cartItemCount === 1 ? 'item' : 'itens'} no carrinho
                            </div>
                          )}
                        </div>
                        {isActive && (
                          <div className="w-2 h-8 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full" />
                        )}
                      </motion.button>
                    );
                  })}
                </nav>

                <div className="mt-8 pt-6 border-t border-white/20">
                  <button
                    onClick={() => {
                      onLogout?.();
                      setIsSidebarOpen(false);
                    }}
                    className="w-full flex items-center space-x-4 p-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 transition-all duration-300"
                  >
                    <div className="p-3 rounded-lg bg-red-500 shadow-lg">
                      <LogOut className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-white font-medium">Sair do Sistema</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
