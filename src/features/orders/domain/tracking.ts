/** Public sipariş takibinin saf mantığı (A20). */
import type { OrderStatus } from './status';

export interface TrackedItem {
  productId: string | null;
  name: string;
  quantity: number;
  /** Perakendecinin satış fiyatı (KATMAN 3); kayıt yoksa 0. */
  unit_price: number;
  total_price: number;
}

export interface TrackedReturnLine {
  productId?: string;
  orderItemId?: string;
  quantity: number;
}

export interface TrackedLog {
  status: OrderStatus;
  created_at: string;
}

export interface TrackedShipment {
  id: string;
  status: OrderStatus;
  created_at: string;
  items: TrackedItem[];
  returned_items: TrackedReturnLine[];
  history: TrackedLog[];
}

export interface TrackedPayment {
  amount: number;
  method: string;
  description: string | null;
  created_at: string;
}

export interface TrackedOrder {
  order_no: string;
  status: OrderStatus;
  customer_name: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  items: TrackedItem[];
  returned_items: TrackedReturnLine[];
  history: TrackedLog[];
  shipments: TrackedShipment[];
  payments: TrackedPayment[];
}

export interface AggregatedLine {
  key: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

/** Müşteriye gösterilen dört aşama. Ara durumlar bu adımlara eşlenir. */
export const TRACK_STEPS: { status: OrderStatus; label: string; desc: string }[] = [
  { status: 'pending', label: 'Sipariş Alındı', desc: 'Siparişiniz alındı ve onay bekliyor.' },
  { status: 'in_production', label: 'Üretimde', desc: 'Ürünleriniz hazırlanıyor.' },
  { status: 'shipped', label: 'Sevk Edildi', desc: 'Siparişiniz yola çıktı.' },
  { status: 'delivered', label: 'Teslim Edildi', desc: 'Siparişiniz size ulaştırıldı.' },
];

/**
 * Aşama sırası. `confirmed` ve `partially_shipped` KÖPRÜ'ye özgüdür ve
 * müşteriye ayrı aşama olarak gösterilmez; en yakın adıma eşlenir.
 * İptal/iade zincir dışıdır: -1 döner.
 */
export function stepIndexOf(status: OrderStatus): number {
  if (status === 'cancelled' || status === 'returned') return -1;
  if (status === 'confirmed') return 0;
  if (status === 'partially_shipped') return 2;
  if (status === 'return_requested') return 2;
  return TRACK_STEPS.findIndex((s) => s.status === status);
}

/** İade satırının hangi kaleme ait olduğu iki alandan biriyle gelebilir. */
const returnedQtyFor = (item: TrackedItem, returns: TrackedReturnLine[]): number =>
  returns
    .filter((r) => (r.productId ? r.productId === item.productId : false))
    .reduce((sum, r) => sum + Number(r.quantity ?? 0), 0);

interface Source {
  items: TrackedItem[];
  returnedItems: TrackedReturnLine[];
  status: OrderStatus;
}

/**
 * Kalemleri toplar.
 *
 * `original` — sipariş edildiği hâli; sevkiyat/iade/iptal ne olursa olsun SABİT.
 * `remaining` — iptal edilen kaynaklar hariç, iade edilen adet düşülmüş hâli.
 *
 * Kök sipariş ve çocuk sevkiyatlar birlikte verilir: kısmi sevkiyatta adetler
 * çocuklara taşındığı için tek başına kök kayıt sipariş toplamını göstermez.
 */
export function aggregate(sources: Source[], mode: 'original' | 'remaining'): AggregatedLine[] {
  const map = new Map<string, AggregatedLine>();

  for (const src of sources) {
    if (mode === 'remaining' && src.status === 'cancelled') continue;

    for (const item of src.items) {
      const qty =
        mode === 'original'
          ? item.quantity
          : item.quantity - returnedQtyFor(item, src.returnedItems);
      if (qty <= 0) continue;

      const key = item.productId ?? item.name;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += qty;
      } else {
        map.set(key, { key, name: item.name, unitPrice: item.unit_price, quantity: qty });
      }
    }
  }

  return [...map.values()];
}

export const sourcesOf = (order: TrackedOrder): Source[] => [
  { items: order.items, returnedItems: order.returned_items, status: order.status },
  ...order.shipments.map((s) => ({
    items: s.items,
    returnedItems: s.returned_items,
    status: s.status,
  })),
];

export const linesTotal = (lines: AggregatedLine[]): number =>
  Math.round(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0) * 100) / 100;

/**
 * Müşteri tahsilatı mı, iptal/iade karşılığı mı?
 *
 * `track_order` cari ALACAK kayıtlarının tamamını döndürür; bir kısmı iptal ya
 * da iade karşılığıdır. Ayırt edici kolon olmadığı için açıklamaya bakılıyor.
 *
 * Küçük harfe TÜRKÇE kurallarıyla çevriliyor: JavaScript'te `'İ'` küçültülünce
 * `'i'` DEĞİL, `'i'` + birleşen nokta olur; `/iade/i` bu yüzden "İade bedeli"
 * ile eşleşmez ve iade alacağı sessizce müşteri tahsilatı sayılırdı.
 */
export const isCustomerPayment = (p: TrackedPayment): boolean =>
  !/iptal|iade/.test((p.description ?? '').toLocaleLowerCase('tr'));
