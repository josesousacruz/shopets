import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Minus, CreditCard, Banknote, Smartphone, Edit2, Check, ShoppingBag, X } from 'lucide-react';
import { Cart as CartType, CartItem, Product } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { categories } from '../../data/mockData';

interface CartProps {
  cart: CartType | null;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: (paymentMethod: 'dinheiro' | 'cartao' | 'pix') => void;
  onRenameCart: (cartId: string, newName: string) => void;
}

const getUnitLabel = (unit: string): string => {
  const labels = {
    'kg': 'kg', 'g': 'g', 'L': 'L', 'ml': 'ml', 'peca': 'un.',
    'pacote': 'pct.', 'caixa': 'cx.', 'metro': 'm', 'cm': 'cm'
  };
  return labels[unit as keyof typeof labels] || unit;
};

const Cart: React.FC<CartProps> = ({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onRenameCart,
}) => {
  const [showPayment, setShowPayment] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState<string>('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [cartName, setCartName] = useState(cart?.name || '');

  useEffect(() => {
    if (cart) {
      setCartName(cart.name);
      setShowPayment(false);
    }
  }, [cart]);

  if (!cart) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center h-full flex flex-col justify-center items-center">
        <ShoppingBag className="text-gray-300 mb-4" size={64} strokeWidth={1} />
        <h3 className="text-gray-600 font-semibold text-lg">Nenhum carrinho selecionado</h3>
        <p className="text-sm text-gray-400 mt-2">Crie ou selecione um carrinho para começar a vender.</p>
      </div>
    );
  }

  const { id, items, total } = cart;

  const handleEditQuantity = (item: CartItem) => {
    setEditingItem(item.product.id);
    setTempQuantity(item.quantity.toString());
  };

  const handleSaveQuantity = (productId: string, product: Product) => {
    const quantity = parseFloat(tempQuantity);
    const minQuantity = product.minQuantity || (product.allowFractional ? 0.01 : 1);
    
    if (!isNaN(quantity) && quantity >= minQuantity) {
      onUpdateQuantity(productId, quantity);
    } else {
      onRemoveItem(productId);
    }
    setEditingItem(null);
  };

  const adjustQuantity = (item: CartItem, delta: number) => {
    const step = item.product.stepQuantity || 1;
    const newQuantity = item.quantity + (delta * step);
    const minQuantity = item.product.minQuantity || (item.product.allowFractional ? step : 1);
    
    if (newQuantity < minQuantity) {
      onRemoveItem(item.product.id);
    } else {
      onUpdateQuantity(item.product.id, newQuantity);
    }
  };

  const handleRename = () => {
    if (isRenaming && cartName.trim()) {
      onRenameCart(id, cartName.trim());
    }
    setIsRenaming(!isRenaming);
  };

  return (
    <div className="bg-transparent flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        {isRenaming ? (
          <input
            type="text"
            value={cartName}
            onChange={(e) => setCartName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            onBlur={handleRename}
            className="font-semibold text-lg text-gray-800 bg-gray-100 rounded px-2 py-1 -ml-2 w-full"
            autoFocus
          />
        ) : (
          <h3 className="font-semibold text-lg text-gray-800">{cart.name}</h3>
        )}
        <button onClick={handleRename} className="text-blue-600 hover:text-blue-800 p-1 ml-2">
          {isRenaming ? <Check size={20} /> : <Edit2 size={18} />}
        </button>
      </div>
      
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <ShoppingBag className="text-gray-300 mb-4" size={64} strokeWidth={1} />
          <h3 className="text-gray-600 font-semibold text-lg">Carrinho vazio</h3>
          <p className="text-sm text-gray-400 mt-1">Adicione produtos para começar a venda.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.product.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
                className="p-4 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                     <span className="text-3xl">{categories.find(c => c.name === item.product.category)?.icon || '📦'}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-sm text-gray-800 truncate pr-2">{item.product.name}</h4>
                      <button onClick={() => onRemoveItem(item.product.id)} className="text-gray-400 hover:text-red-500 ml-2 flex-shrink-0 p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-green-600 mt-1">R$ {(item.product.price * item.quantity).toFixed(2)}</p>

                    <div className="flex items-center justify-between mt-2">
                      {editingItem === item.product.id ? (
                        <div className="flex items-center space-x-1">
                          <input type="number" value={tempQuantity} onChange={(e) => setTempQuantity(e.target.value)} step={item.product.stepQuantity} min={item.product.minQuantity} className="w-24 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500" autoFocus />
                          <button onClick={() => handleSaveQuantity(item.product.id, item.product)} className="text-green-600 hover:text-green-800 p-1"><Check size={18}/></button>
                          <button onClick={() => setEditingItem(null)} className="text-red-600 hover:text-red-800 p-1"><X size={18}/></button>
                        </div>
                      ) : (
                        <div className="flex items-center bg-gray-100 rounded-full">
                          <button onClick={() => adjustQuantity(item, -1)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-200 text-gray-600 transition-colors"><Minus size={16} /></button>
                          <div className="px-2 text-center min-w-[60px]">
                            <span onClick={() => item.product.allowFractional && handleEditQuantity(item)} className={`font-medium text-base ${item.product.allowFractional ? 'cursor-pointer hover:text-blue-600' : ''}`}>
                              {item.quantity % 1 !== 0 ? item.quantity.toFixed(2) : item.quantity}
                            </span>
                            <span className="text-xs text-gray-500 ml-1">{getUnitLabel(item.product.unit)}</span>
                          </div>
                          <button onClick={() => adjustQuantity(item, 1)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-200 text-gray-600 transition-colors"><Plus size={16} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      
      <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl md:bg-gray-50 flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold text-lg">Total:</span>
          <span className="font-bold text-xl text-green-600">R$ {total.toFixed(2)}</span>
        </div>
        
        {!showPayment ? (
          <button onClick={() => setShowPayment(true)} disabled={items.length === 0} className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
            Finalizar Venda
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-center text-gray-600 mb-3">Escolha a forma de pagamento:</p>
            <button onClick={() => onCheckout('dinheiro')} className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"><Banknote size={20} /><span>Dinheiro</span></button>
            <button onClick={() => onCheckout('cartao')} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"><CreditCard size={20} /><span>Cartão</span></button>
            <button onClick={() => onCheckout('pix')} className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"><Smartphone size={20} /><span>PIX</span></button>
            <button onClick={() => setShowPayment(false)} className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-400 transition-colors mt-2">Voltar</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
