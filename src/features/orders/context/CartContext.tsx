/**
 * Sepet bağlamı — Perakendeci paneli genelinde sepet durumunu paylaşır.
 *
 * CatalogPage, CartPage ve TopBar bu bağlamı tüketerek tutarlı bir
 * sepet deneyimi sunar. Yalnız perakendeci panelinde kullanılır.
 */
import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  addLine,
  setQuantity,
  setRetailPrice,
  cartTotals,
  type CartLine,
  type CartTotals,
} from '@/features/orders';

interface CartContextValue {
  lines: CartLine[];
  totals: CartTotals;
  supplierId: string | null;
  setSupplierId: (id: string | null) => void;
  addCartLine: (line: CartLine) => void;
  setCartQuantity: (
    productId: string,
    quantity: number,
    customDescription?: string,
    priceDifference?: number
  ) => void;
  setCartRetailPrice: (
    productId: string,
    price: number | undefined,
    customDescription?: string,
    priceDifference?: number
  ) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [supplierId, setSupplierId] = useState<string | null>(null);

  const totals = cartTotals(lines);

  const addCartLine = (line: CartLine) => {
    setLines((prev) => addLine(prev, line));
  };

  const setCartQuantity = (
    productId: string,
    quantity: number,
    customDescription?: string,
    priceDifference?: number
  ) => {
    setLines((prev) => setQuantity(prev, productId, quantity, customDescription, priceDifference));
  };

  const setCartRetailPrice = (
    productId: string,
    price: number | undefined,
    customDescription?: string,
    priceDifference?: number
  ) => {
    setLines((prev) => setRetailPrice(prev, productId, price, customDescription, priceDifference));
  };

  const clearCart = () => setLines([]);

  return (
    <CartContext.Provider
      value={{ lines, totals, supplierId, setSupplierId, addCartLine, setCartQuantity, setCartRetailPrice, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
