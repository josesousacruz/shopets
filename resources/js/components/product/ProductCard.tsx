import React from 'react';
import { Plus } from 'lucide-react';
import { Product } from '../../types';
import { motion } from 'framer-motion';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  showStock?: boolean;
}

const getUnitLabel = (unit: string): string => {
  const labels = {
    'kg': 'kg',
    'g': 'g',
    'L': 'L',
    'ml': 'ml',
    'peca': 'un.',
    'pacote': 'pct.',
    'caixa': 'cx.',
    'metro': 'm',
    'cm': 'cm'
  };
  return labels[unit as keyof typeof labels] || unit;
};

const formatPrice = (price: number, unit: string): string => {
  // Exibir preço por unidade individual para melhor clareza
  return `R$ ${price.toFixed(2)}/${getUnitLabel(unit)}`;
};

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, showStock = false }) => {
  const isOutOfStock = product.stock === 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      className={`bg-white rounded-xl shadow-md border transition-all ${
        isOutOfStock ? 'opacity-60' : 'hover:shadow-lg'
      }`}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-800 text-sm leading-tight flex-1">
            {product.name}
          </h3>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
            {product.category}
          </span>
        </div>
        
        <div className="mb-2">
          <p className="text-lg font-bold text-green-600">
            {formatPrice(product.price, product.unit)}
          </p>
          {product.allowFractional && (
            <p className="text-xs text-gray-500">
              Mín: {product.minQuantity} {getUnitLabel(product.unit)}
            </p>
          )}
        </div>
        
        <div className="flex justify-between items-end">
          <div>
            {showStock && (
              <p className={`text-xs ${isOutOfStock ? 'text-red-500' : 'text-gray-500'}`}>
                Estoque: {product.stock} {getUnitLabel(product.unit)}
              </p>
            )}
            <div className="flex items-center space-x-1 mt-1">
              <span className={`text-xs px-2 py-1 rounded-full ${
                product.allowFractional 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {product.allowFractional ? 'Fracionado' : 'Unidade'}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => onAddToCart(product)}
            disabled={isOutOfStock}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isOutOfStock
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
