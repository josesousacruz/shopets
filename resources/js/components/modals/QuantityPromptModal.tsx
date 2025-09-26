import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
import Swal from 'sweetalert2';
import { Product } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface QuantityPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (product: Product, quantity: number) => void;
  product: Product | null;
}

const getUnitLabel = (unit: string): string => {
  const labels = {
    'kg': 'kg', 'g': 'g', 'L': 'L', 'ml': 'ml', 'peca': 'un.',
    'pacote': 'pct.', 'caixa': 'cx.', 'metro': 'm', 'cm': 'cm'
  };
  return labels[unit as keyof typeof labels] || unit;
};

const QuantityPromptModal: React.FC<QuantityPromptModalProps> = ({ isOpen, onClose, onConfirm, product }) => {
  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    if (product) {
      setQuantity((product.minQuantity || 1).toString());
    }
  }, [product]);

  if (!product) return null;

  const handleConfirm = () => {
    const numQuantity = parseFloat(quantity);
    const minQuantity = product.minQuantity || (product.allowFractional ? 0.01 : 1);
    if (!isNaN(numQuantity) && numQuantity >= minQuantity) {
      onConfirm(product, numQuantity);
    } else {
      // Optionally show an error message
      Swal.fire({
        title: 'Quantidade Inválida',
        text: `A quantidade mínima é ${minQuantity}.`,
        icon: 'warning',
        confirmButtonText: 'OK',
        confirmButtonColor: '#f59e0b'
      });
    }
  };

  const adjustQuantity = (delta: number) => {
    const step = product.stepQuantity || 1;
    const currentQuantity = parseFloat(quantity) || 0;
    let newQuantity = currentQuantity + (delta * step);
    
    const minQuantity = product.minQuantity || (product.allowFractional ? step : 1);
    if (newQuantity < minQuantity) {
      newQuantity = minQuantity;
    }
    
    setQuantity(product.allowFractional ? newQuantity.toFixed(2) : Math.round(newQuantity).toString());
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 pr-4">
                  <h2 className="text-xl font-bold text-gray-800">{product.name}</h2>
                  <p className="text-sm text-gray-500">{product.category}</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mt-1 -mr-1">
                  <X size={24} />
                </button>
              </div>

              <div className="text-center my-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade</label>
                <div className="flex items-center justify-center space-x-4">
                  <button onClick={() => adjustQuantity(-1)} className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors"><Minus size={20} /></button>
                  <div className="flex items-baseline">
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      step={product.stepQuantity}
                      min={product.minQuantity}
                      className="w-28 text-center text-4xl font-bold bg-transparent focus:outline-none"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                    />
                    <span className="text-lg text-gray-500 font-medium ml-1">{getUnitLabel(product.unit)}</span>
                  </div>
                  <button onClick={() => adjustQuantity(1)} className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors"><Plus size={20} /></button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Mín: {product.minQuantity} {getUnitLabel(product.unit)}</p>
              </div>

              <button
                onClick={handleConfirm}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 text-lg"
              >
                <ShoppingCart size={20} />
                <span>Adicionar</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QuantityPromptModal;
