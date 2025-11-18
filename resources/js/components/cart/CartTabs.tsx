import React, { useRef, useEffect } from 'react';
import { Plus, X, ShoppingCart } from 'lucide-react';
import Swal from 'sweetalert2';
import { Cart } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import CustomScrollBar from '../ui/CustomScrollBar';

interface CartTabsProps {
  carts: Cart[];
  activeCartId: string | null;
  onSelectCart: (cartId: string) => void;
  onAddCart: () => void;
  onRemoveCart: (cartId: string) => void;
  onActiveTabClick?: () => void;
  onOpenHistory?: () => void;
}

const CartTabs: React.FC<CartTabsProps> = ({
  carts,
  activeCartId,
  onSelectCart,
  onAddCart,
  onRemoveCart,
  onActiveTabClick,
  onOpenHistory,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeCartId]);

  const handleRemove = async (e: React.MouseEvent, cartId: string) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'Fechar Carrinho',
      text: 'Tem certeza que deseja fechar este carrinho?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, fechar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280'
    });
    
    if (result.isConfirmed) {
      onRemoveCart(cartId);
    }
  };

  const handleTabClick = (cartId: string) => {
    if (cartId === activeCartId && onActiveTabClick) {
      onActiveTabClick();
    } else {
      onSelectCart(cartId);
    }
  };

  return (
    <div className="border-b border-gray-200 pb-2 space-y-3">
      <div className="flex justify-between items-center">
        {/* Top Row: New Cart Button */}
        <div className="flex justify-start">
          <button
            onClick={onAddCart}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-green-100 text-green-800 hover:bg-green-200 transition-colors shadow-sm text-sm font-semibold"
            aria-label="Adicionar novo carrinho"
          >
            <Plus size={16} />
            <span>Novo Carrinho</span>
          </button>
        </div>

        <div className="flex justify-start">
          <button
            onClick={onOpenHistory}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors shadow-sm text-sm font-semibold"
            aria-label="Abrir histórico de vendas"
          >
            <Plus size={16} />
            <span>Histórico de Vendas</span>
          </button>
        </div>
      </div>
      {/* Bottom Row: Cart List and Scrollbar */}
      <div>
        <div
          ref={scrollContainerRef}
          className="flex items-center space-x-3 overflow-x-auto scrollbar-hide py-2"
        >
          <AnimatePresence>
            {carts.map(cart => (
              <motion.div
                key={cart.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="flex-shrink-0"
              >
                <button
                  ref={cart.id === activeCartId ? activeTabRef : null}
                  onClick={() => handleTabClick(cart.id)}
                  className={`relative flex items-center space-x-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    activeCartId === cart.id
                      ? 'bg-white text-blue-700 shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <ShoppingCart size={16} />
                  <span>{cart.name}</span>
                  {cart.itemCount > 0 && (
                    <span className={`ml-1 text-xs font-bold rounded-full px-2 py-0.5 ${
                      activeCartId === cart.id ? 'bg-blue-600 text-white' : 'bg-gray-400 text-white'
                    }`}>
                      {cart.itemCount}
                    </span>
                  )}
                  {activeCartId === cart.id && carts.length > 1 && (
                    <div
                      onClick={(e) => handleRemove(e, cart.id)}
                      className="ml-1 -mr-1 p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-500 transition-colors cursor-pointer"
                      aria-label={`Remover ${cart.name}`}
                    >
                      <X size={14} />
                    </div>
                  )}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <CustomScrollBar scrollContainerRef={scrollContainerRef as React.RefObject<HTMLDivElement>} />
      </div>
    </div>
  );
};

export default CartTabs;
