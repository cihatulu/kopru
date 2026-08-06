/**
 * Sipariş durumu — SAF (A20).
 * Geçiş kuralları sunucudaki `advance_order_status` ile birebir aynı olmalı;
 * bu katman kullanıcıya hangi butonun görüneceğini belirler, yetki vermez.
 */
import { ORG_KIND, type OrgKind } from '@/constants';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'in_production'
  | 'partially_shipped'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'return_requested'
  | 'returned';

interface StatusMeta {
  label: string;
  className: string;
}

export const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  pending: { label: 'Onay bekliyor', className: 'bg-amber-50 text-amber-700' },
  confirmed: { label: 'Onaylandı', className: 'bg-blue-50 text-blue-700' },
  in_production: { label: 'Üretimde', className: 'bg-indigo-50 text-indigo-700' },
  partially_shipped: { label: 'Kısmi sevk', className: 'bg-cyan-50 text-cyan-700' },
  shipped: { label: 'Sevk edildi', className: 'bg-teal-50 text-teal-700' },
  delivered: { label: 'Teslim edildi', className: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'İptal', className: 'bg-slate-100 text-slate-600' },
  return_requested: { label: 'İade talebi', className: 'bg-orange-50 text-orange-700' },
  returned: { label: 'İade edildi', className: 'bg-rose-50 text-rose-700' },
};

const CLOSED: OrderStatus[] = ['cancelled', 'returned', 'delivered'];

export function isClosed(status: OrderStatus): boolean {
  return CLOSED.includes(status);
}

/**
 * Üreticinin ilerletebileceği zincir.
 * `partially_shipped` → `shipped`: kalan kalemler için sevkiyat devam eder.
 */
const MANUFACTURER_FLOW: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'in_production',
  in_production: 'shipped',
  partially_shipped: 'shipped',
};

/**
 * Bu adım sevkiyat mı? Öyleyse doğrudan durum değiştirmek yerine miktar
 * seçtiren sevkiyat ekranı açılır (kısmi sevkiyat çocuk sipariş üretir).
 */
export function isShipmentStep(to: OrderStatus): boolean {
  return to === 'shipped';
}

/**
 * Bu kullanıcının bu siparişte yapabileceği bir sonraki adım.
 * Üretim akışı üreticinin, teslim onayı perakendecinindir.
 */
export function nextAction(
  status: OrderStatus,
  myKind: OrgKind,
): { to: OrderStatus; label: string } | null {
  if (isClosed(status)) return null;

  if (myKind === ORG_KIND.manufacturer) {
    const to = MANUFACTURER_FLOW[status];
    if (!to) return null;
    return { to, label: isShipmentStep(to) ? 'Sevk et' : ORDER_STATUS_META[to].label };
  }

  // Perakendeci yalnız sevk edilmiş siparişi teslim alındı olarak işaretler.
  if (status === 'shipped' || status === 'partially_shipped') {
    return { to: 'delivered', label: 'Teslim aldım' };
  }
  return null;
}

/** İptal, sevkiyattan önce ve her iki tarafça yapılabilir. */
export function canCancel(status: OrderStatus): boolean {
  return !isClosed(status) && status !== 'shipped' && status !== 'partially_shipped';
}
