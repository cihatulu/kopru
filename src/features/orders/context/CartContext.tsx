/**
 * Sepet bağlamı — Perakendeci paneli genelinde sepet durumunu paylaşır.
 *
 * CatalogPage, CartPage ve TopBar bu bağlamı tüketerek tutarlı bir
 * sepet deneyimi sunar. Yalnız perakendeci panelinde kullanılır.
 */
import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import {
  addLine,
  cartManufacturerName,
  conflictsWithCart,
  setQuantity,
  setRetailPrice,
  cartTotals,
  type CartLine,
  type CartTotals,
} from '@/features/orders';
import { useAuthSession } from '@/features/auth';
import { CartConflictDialog } from '../components/CartConflictDialog';

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
  const { data: user } = useAuthSession();
  const orgId = user?.org?.id;
  const prevOrgIdRef = useRef(orgId);

  const [lines, setLines] = useState<CartLine[]>([]);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [conflict, setConflict] = useState<CartLine | null>(null);

  // Kullanıcı / organizasyon değiştiğinde sepeti sıfırla (başka firmanın sepeti sızmasın)
  useEffect(() => {
    if (prevOrgIdRef.current && prevOrgIdRef.current !== orgId) {
      setLines([]);
      setSupplierId(null);
      setConflict(null);
    }
    prevOrgIdRef.current = orgId;
  }, [orgId]);

  const totals = cartTotals(lines);

  /**
   * Sepet üretici bazlıdır: bir sipariş = bir üretici. Farklı üreticinin ürünü
   * eklenmek istenirse ekleme yapılmaz, kullanıcıya sorulur. Uyarı burada
   * yaşıyor çünkü kuralı bilen tek yer sepetin kendisi.
   */
  const addCartLine = (line: CartLine) => {
    if (conflictsWithCart(lines, line)) {
      setConflict(line);
      return;
    }
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
      {conflict && (
        <CartConflictDialog
          currentName={cartManufacturerName(lines)}
          incomingName={conflict.manufacturerName?.trim() || 'başka bir üretici'}
          productName={conflict.name}
          onCancel={() => setConflict(null)}
          onReplace={() => {
            // Yeni sepet yalnız bu satırla başlar; eski üreticinin satırları
            // kalırsa çakışma bir sonraki adımda yine patlar.
            setLines([conflict]);
            setConflict(null);
          }}
        />
      )}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
