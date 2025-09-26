import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';

interface CartFABProps {
  itemCount: number;
  total: number;
  onClick: () => void;
}

const CartFAB: React.FC<CartFABProps> = ({ itemCount, total, onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      className="md:hidden fixed bottom-4 right-4 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center p-4 z-40"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      <div className="relative">
        <ShoppingCart size={24} />
        {itemCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {itemCount}
          </span>
        )}
      </div>
      <span className="ml-2 font-semibold">R$ {total.toFixed(2)}</span>
    </motion.button>
  );
};

export default CartFAB;
