import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Cart from './Cart';
import { Cart as CartType } from '../../types';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartType | null;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
  onRenameCart: (cartId: string, newName: string) => void;
  onUpdateItemDiscount?: (productId: string, desconto_item: number) => void;
}

const CartModal: React.FC<CartModalProps> = ({ isOpen, onClose, ...cartProps }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-60 flex flex-col justify-end z-50 md:hidden"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-gray-50 rounded-t-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex justify-between items-center border-b border-gray-200 bg-white rounded-t-2xl sticky top-0">
              <h2 className="font-bold text-lg text-gray-800">{cartProps.cart?.name || 'Carrinho'}</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto">
              <Cart {...cartProps} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CartModal;
