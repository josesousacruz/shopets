import { useState, useMemo } from 'react';
import { Cart, CartItem, Product } from '../types';

let cartCounter = 1;

const createNewCart = (): Cart => ({
  id: Date.now().toString(),
  name: `Cliente ${cartCounter++}`,
  items: [],
  total: 0,
  itemCount: 0,
});

export const useMultiCart = () => {
  const [carts, setCarts] = useState<Cart[]>([createNewCart()]);
  const [activeCartId, setActiveCartId] = useState<string | null>(carts[0]?.id || null);

  const updateCartCalculations = (cart: Cart): Cart => {
    const total = cart.items.reduce((sum, item) => {
      const bruto = (Number(item.product.price) || 0) * (Number(item.quantity) || 0);
      const desconto = Number(item.desconto_item || 0);
      const liquido = Math.max(0, bruto - desconto);
      return sum + liquido;
    }, 0);
    const itemCount = cart.items.length;
    return { ...cart, total, itemCount };
  };

  const updateCartsState = (newCarts: Cart[]) => {
    const updatedCarts = newCarts.map(updateCartCalculations);
    setCarts(updatedCarts);
  };

  const addCart = () => {
    const newCart = createNewCart();
    updateCartsState([...carts, newCart]);
    setActiveCartId(newCart.id);
  };

  const removeCart = (cartId: string) => {
    const newCarts = carts.filter(cart => cart.id !== cartId);
    
    if (newCarts.length === 0) {
      const defaultCart = createNewCart();
      updateCartsState([defaultCart]);
      setActiveCartId(defaultCart.id);
    } else {
      updateCartsState(newCarts);
      if (activeCartId === cartId) {
        setActiveCartId(newCarts[0].id);
      }
    }
  };

  const renameCart = (cartId: string, newName: string) => {
    const newCarts = carts.map(cart =>
      cart.id === cartId ? { ...cart, name: newName } : cart
    );
    updateCartsState(newCarts);
  };

  const modifyActiveCart = (modification: (cart: Cart) => Cart) => {
    if (!activeCartId) return;
    const newCarts = carts.map(cart =>
      cart.id === activeCartId ? modification(cart) : cart
    );
    updateCartsState(newCarts);
  };

  const addItemToActiveCart = (product: Product, quantityToAdd?: number) => {
    const quantity = quantityToAdd || product.minQuantity || 1;

    modifyActiveCart(cart => {
      const existingItem = cart.items.find(item => item.product.id === product.id);
      
      if (existingItem) {
        const newItems = cart.items.map(item =>
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
        return { ...cart, items: newItems };
      } else {
        const newItems = [...cart.items, { product, quantity }];
        return { ...cart, items: newItems };
      }
    });
  };
  
  const removeActiveCartItem = (productId: string) => {
    modifyActiveCart(cart => {
      const newItems = cart.items.filter(item => item.product.id !== productId);
      return { ...cart, items: newItems };
    });
  };

  const updateActiveCartItemQuantity = (productId: string, quantity: number) => {
    modifyActiveCart(cart => {
      const item = cart.items.find(i => i.product.id === productId);
      if (!item) return cart;

      const minQuantity = item.product.minQuantity || 1;
      if (quantity < minQuantity && item.product.allowFractional) {
        const newItems = cart.items.filter(i => i.product.id !== productId);
        return { ...cart, items: newItems };
      }
      
      const newItems = cart.items.map(i =>
        i.product.id === productId ? { ...i, quantity } : i
      );
      return { ...cart, items: newItems };
    });
  };

  const updateActiveCartItemDiscount = (productId: string, desconto_item: number) => {
    modifyActiveCart(cart => {
      const newItems = cart.items.map(i =>
        i.product.id === productId ? { ...i, desconto_item } : i
      );
      return { ...cart, items: newItems };
    });
  };

  const clearActiveCart = () => {
    modifyActiveCart(cart => ({ ...cart, items: [] }));
  };

  const activeCart = useMemo(() => {
    return carts.find(cart => cart.id === activeCartId) || null;
  }, [carts, activeCartId]);

  return {
    carts,
    activeCartId,
    activeCart,
    addCart,
    removeCart,
    renameCart,
    setActiveCart: setActiveCartId,
    addItemToActiveCart,
    removeActiveCartItem,
    updateActiveCartItemQuantity,
    updateActiveCartItemDiscount,
    clearActiveCart,
  };
};
