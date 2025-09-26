import { useState } from 'react';
import { CartItem, Product } from '../types';

export const useCart = () => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (product: Product, quantity?: number) => {
    const defaultQuantity = quantity || product.minQuantity || 1;
    
    setItems(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      
      if (existingItem) {
        const step = product.stepQuantity || 1;
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + step }
            : item
        );
      }
      
      return [...prev, { product, quantity: defaultQuantity }];
    });
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const item = items.find(item => item.product.id === productId);
    if (!item) return;

    const minQuantity = item.product.minQuantity || 1;
    
    if (quantity < minQuantity) {
      removeItem(productId);
      return;
    }
    
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    total,
    itemCount,
  };
};
