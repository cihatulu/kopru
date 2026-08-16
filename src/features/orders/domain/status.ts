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
  pending: { label: 'Bekliyor', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  confirmed: { label: 'Bekliyor', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  in_production: { label: 'Üretiliyor', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  partially_shipped: { label: 'Kısmi Sevk', className: 'bg-brand-50 text-brand-700 border border-brand-200' },
  shipped: { label: 'Sevkiyatta', className: 'bg-purple-50 text-purple-700 border border-purple-200' },
  delivered: { label: 'Teslim Edildi', className: 'bg-green-50 text-green-700 border border-green-200' },
  cancelled: { label: 'İptal Edildi', className: 'bg-red-50 text-red-700 border border-red-200' },
  return_requested: { label: 'İade Sürecinde', className: 'bg-orange-50 text-orange-700 border border-orange-200' },
  returned: { label: 'İade Edildi', className: 'bg-red-50 text-red-700 border border-red-200' },
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

/** İptal, kapalı (teslim edilen veya zaten iptal/iade edilmiş) olmayan her siparişte yapılabilir. */
export function canCancel(status: OrderStatus): boolean {
  return !isClosed(status);
}

/** Kullanıcının durum dropdown'ında seçebileceği geçiş hedefleri. */
export function getAvailableTransitions(
  status: OrderStatus,
  myKind: OrgKind,
): { value: OrderStatus; label: string }[] {
  const list: { value: OrderStatus; label: string }[] = [
    { value: status, label: ORDER_STATUS_META[status].label },
  ];

  if (isClosed(status)) return list;

  const next = nextAction(status, myKind);
  if (next) {
    list.push({ value: next.to, label: ORDER_STATUS_META[next.to].label });
  }

  if (canCancel(status)) {
    list.push({ value: 'cancelled', label: 'İptal Et' });
  }

  return list;
}
