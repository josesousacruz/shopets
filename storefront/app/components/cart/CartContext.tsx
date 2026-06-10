import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface CartUI {
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
  /** Mensagem de toast efêmera (ou null). */
  toast: string | null;
  showToast: (msg: string) => void;
  clearToast: () => void;
}

const CartContext = createContext<CartUI | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const openCart = useCallback(() => setOpen(true), []);
  const closeCart = useCallback(() => setOpen(false), []);
  const clearToast = useCallback(() => setToast(null), []);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const value = useMemo(
    () => ({ open, openCart, closeCart, toast, showToast, clearToast }),
    [open, openCart, closeCart, toast, showToast, clearToast],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartUI {
  const ctx = useContext(CartContext);
  if (!ctx) {
    // Fallback seguro (ex.: SSR fora do provider) — no-op.
    return {
      open: false,
      openCart: () => {},
      closeCart: () => {},
      toast: null,
      showToast: () => {},
      clearToast: () => {},
    };
  }
  return ctx;
}
