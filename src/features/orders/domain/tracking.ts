/** Public sipariş takibinin saf mantığı (A20). */
import type { OrderStatus } from './status';

export interface TrackedItem {
  productId: string | null;
  name: string;
  quantity: number;
  /** Perakendecinin satış fiyatı, HER ŞEY DAHİL (taban + fark); kayıt yoksa 0. */
  unit_price: number;
  total_price: number;
  /** Müşterinin kendi değişiklik talebi; takip sayfasında da görünür. */
  custom_description?: string | null;
  /**
   * `unit_price` İÇİNDEKİ özel talep farkı — yalnız kırılım için.
   * Toplama ayrıca eklenmez; eklenirse fark iki kez sayılır.
   */
  price_difference?: number | null;
}

export interface TrackedReturnLine {
  productId?: string;
  orderItemId?: string;
  name?: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  custom_description?: string | null;
}

export interface TrackedLog {
  status: OrderStatus;
  /** Durum değiştirilirken yazılan açıklama; müşteriye de görünür. */
  note: string | null;
  created_at: string;
  /** Hangi sipariş/sevkiyata ait olduğunu gösterir; takip zaman çizelgesinde görünür. */
  order_no?: string | null;
}

export interface TrackedShipment {
  id: string;
  order_no: string;
  status: OrderStatus;
  note: string | null;
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

export interface TrackedCustomerDelivery {
  id: string;
  order_no?: string;
  delivery_date: string;
  time_slot: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  notes?: string | null;
  status: 'planned' | 'shipped' | 'delivered' | 'cancelled';
  items?: Array<{ order_item_id?: string; name: string; quantity: number }>;
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
  customer_deliveries?: TrackedCustomerDelivery[];
}

export interface AggregatedLine {
  key: string;
  name: string;
  unitPrice: number;
  quantity: number;
  /** Bu ürün için verilen özel talep; yoksa null. */
  customDescription: string | null;
  /**
   * Talep farkı (eksi ise indirim). `unitPrice`'a DAHİL DEĞİLDİR: ürünün kendi
   * fiyatı sabit gösterilir, fark ayrı satırda okunur.
   */
  priceDifference: number;
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

/**
 * Siparişin efektif durumu.
 *
 * Kök sipariş iptal edilse dahi (kalan parçalar iptal edildiğinde kök sipariş iptal durumuna çekilir)
 * aktif çocuk sevkiyatlar varsa (shipped veya delivered) sipariş iptal edilmiş sayılmaz,
 * bu aktif çocuk sevkiyatların en ilerideki durumuna göre takip adımları gösterilir.
 */
export function getEffectiveStatus(order: TrackedOrder): OrderStatus {
  if (order.status !== 'cancelled' && order.status !== 'returned') {
    return order.status;
  }

  const activeShipments = (order.shipments ?? []).filter(
    (s) => s.status !== 'cancelled' && s.status !== 'returned'
  );

  if (activeShipments.length > 0) {
    const statuses = activeShipments.map((s) => s.status);
    if (statuses.includes('delivered')) return 'delivered';
    if (statuses.includes('shipped') || statuses.includes('partially_shipped')) return 'shipped';
    return 'confirmed';
  }

  return order.status;
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
 * Kök siparişin ve tüm sevkiyatların geçmişi, zamana göre birleşik.
 *
 * Sevkiyat kayıtları çocuk siparişlerde tutulduğu için kökün geçmişi tek
 * başına yarım kalıyordu; müşteri "kısmi sevk" satırlarının notunu göremezdi.
 */
export function mergedHistory(order: TrackedOrder): TrackedLog[] {
  // Kısmi sevk logları kök siparişin geçmişinde tutulur ama hangi child
  // sevkiyata ait olduğunu göstermek için zaman damgasıyla eşleştiriyoruz.
  // Her partially_shipped root log'unu, en yakın child sevkiyatıyla eşleştirip
  // o child'ın order_no'sunu etiket olarak kullanıyoruz.
  const childsByTime = [...order.shipments].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );

  // Kullanılmış child indeksini takip et (her log farklı bir child'a denk gelsin)
  let partialIdx = 0;

  const rootLogs = order.history.map((h) => {
    const child = h.status === 'partially_shipped' ? childsByTime[partialIdx] : undefined;
    if (child) {
      partialIdx++;
      return { ...h, order_no: child.order_no };
    }
    return { ...h, order_no: order.order_no };
  });

  const shipmentLogs = order.shipments.flatMap((s) =>
    s.history.map((h) => ({ ...h, order_no: s.order_no }))
  );

  return [...rootLogs, ...shipmentLogs].sort((a, b) => a.created_at.localeCompare(b.created_at));
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

      // Özel talep anahtarın parçası: aynı üründen biri düz biri değişiklikli
      // sipariş edilmişse bunlar ayrı satırdır, tek satırda toplanmamalı.
      const custom = item.custom_description?.trim() || null;
      const key = `${item.productId ?? item.name}|${custom ?? ''}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += qty;
      } else {
        // `unit_price` her şey dahil gelir; ürünün kendi fiyatı için fark geri
        // çıkarılır. İkisi ekranda ayrı satırda durur, toplamda birleşir.
        const diff = Number(item.price_difference ?? 0);
        map.set(key, {
          key,
          name: item.name,
          unitPrice: Math.round((item.unit_price - diff) * 100) / 100,
          quantity: qty,
          customDescription: custom,
          priceDifference: diff,
        });
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

/** Sipariş toplamı — taban fiyat AYRI durduğu için fark burada geri eklenir. */
export const linesTotal = (lines: AggregatedLine[]): number =>
  Math.round(
    lines.reduce((sum, l) => sum + (l.unitPrice + l.priceDifference) * l.quantity, 0) * 100,
  ) / 100;

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
