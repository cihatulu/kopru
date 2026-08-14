/**
 * Sipariş satırlarının ham JSON'dan okunması — SAF (A20).
 *
 * KATMAN AYRIMI burada yaşıyor: `supplierUnitPrice` alanına perakendeci
 * görünümünde perakende fiyatı yazılır, üretici görünümünde üreticinin satış
 * fiyatı. İki taraf aynı sorguyu çalıştırır, RLS gizli katmanı zaten
 * döndürmez; hesap da bu yüzden tek yerde durmak zorunda (A4).
 */
import type { OrderStatus } from './status';

type Row = Record<string, unknown>;

export const str = (v: unknown): string => (typeof v === 'string' ? v : '');
export const num = (v: unknown): number => Number(v ?? 0);
export const nullable = (v: unknown): string | null => (typeof v === 'string' ? v : null);
export const nested = (v: unknown): Row => (v && typeof v === 'object' ? (v as Row) : {});

export interface OrderRow {
  id: string;
  orderNo: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  manufacturerOrgId: string;
  retailerOrgId: string;
  relationshipId: string;
  counterpartyName: string;
  customerName: string | null;
  parentOrderId: string | null;
}

export interface OrderItemRow {
  id: string;
  productId: string | null;
  name: string;
  code: string;
  quantity: number;
  supplierUnitPrice: number;
  totalPrice: number;
  /** Müşterinin değişiklik talebi — üretim talimatı, her iki taraf görür. */
  customDescription: string | null;
  /**
   * Özel talep farkı (eksi ise indirim). `supplierUnitPrice`'a DAHİL DEĞİLDİR,
   * `totalPrice`'a dahildir: ekran tabanı ve farkı ayrı satırda gösterir.
   */
  priceDifference: number;
}

export interface OrderStatusLogItem {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  createdAt: string;
  shipmentBadge?: string | null;
}

export interface ChildShipment {
  id: string;
  shipmentNo: string;
  createdAt: string;
  totalAmount: number;
  status: OrderStatus;
}

export interface OrderDetail extends OrderRow {
  customerPhone: string | null;
  customerAddress: string | null;
  note: string | null;
  orderToken: string;
  items: OrderItemRow[];
  history: OrderStatusLogItem[];
  shipments: ChildShipment[];
  hasUnfulfilledBalance: boolean;
}

/**
 * Gömülü tek kaydı okur.
 *
 * PostgREST bire-bir gömmeyi kimi yerde tek elemanlı DİZİ, kimi yerde doğrudan
 * NESNE döndürür (ilişkiyi tekil algıladığında). Yalnız diziyi karşılamak,
 * `order_item_retail_prices` nesne geldiğinde kaydı görünmez yapıyordu: sipariş
 * listesi ve detayı sipariş anındaki fiyat yerine ürünün GÜNCEL perakende
 * fiyatına düşüyor, özel talep farkı da böylece ekranda kayboluyordu.
 */
function firstOf(v: unknown): Row | undefined {
  if (Array.isArray(v)) {
    const arr = v as unknown[];
    return arr.length > 0 ? nested(arr[0]) : undefined;
  }
  return v && typeof v === 'object' ? (v as Row) : undefined;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Kalemin HER ŞEY DAHİL perakende birim fiyatı (taban + özel talep farkı).
 *
 * İki kaynak farklı şey tutar ve karıştırılmamalıdır:
 *   · `order_item_retail_prices.retail_unit_price` — sipariş anında donmuş,
 *     fark ZATEN İÇİNDE.
 *   · `products.retail_prices.retail_price` — ürünün güncel liste fiyatı, fark
 *     İÇERMEZ; kayıt yoksa buna düşülür ve fark elle eklenir.
 *
 * Hiçbiri yoksa undefined — çağıran üretici fiyatını kullanır.
 */
function retailAllIn(item: Row, diff: number): number | undefined {
  const recorded = firstOf(item.order_item_retail_prices);
  if (recorded) {
    const price = num(recorded.retail_unit_price);
    if (price > 0) return price;
  }

  const current = firstOf(nested(item.products).retail_prices);
  if (current) {
    const price = num(current.retail_price);
    if (price > 0) return round2(price + diff);
  }

  return undefined;
}

export function toRow(raw: unknown, myOrgId: string): OrderRow {
  const r = raw as Row;
  const iAmManufacturer = r.manufacturer_org_id === myOrgId;
  const other = nested(iAmManufacturer ? r.retailer : r.manufacturer);

  let totalAmount = num(r.total_amount);

  // Perakendeci kendi listesinde KENDİ satış fiyatı toplamını görür.
  if (!iAmManufacturer && Array.isArray(r.order_items)) {
    let retailTotal = 0;
    let hasRetail = false;
    for (const itemRaw of r.order_items) {
      const item = nested(itemRaw);
      const qty = num(item.quantity);
      const diff = num(item.price_difference);
      const price = retailAllIn(item, diff);
      if (price !== undefined && price > 0) {
        retailTotal += price * qty;
        hasRetail = true;
      } else {
        // Fark burada da sayılır; yoksa liste toplamı detaydan sapardı.
        retailTotal += (num(item.supplier_unit_price) + diff) * qty;
      }
    }
    if (hasRetail && retailTotal > 0) totalAmount = round2(retailTotal);
  }

  return {
    id: str(r.id),
    orderNo: str(r.order_no),
    status: r.status as OrderStatus,
    totalAmount,
    createdAt: str(r.created_at),
    manufacturerOrgId: str(r.manufacturer_org_id),
    retailerOrgId: str(r.retailer_org_id),
    relationshipId: str(r.relationship_id),
    counterpartyName: str(other.company_name) || '—',
    customerName: nullable(r.customer_name),
    parentOrderId: nullable(r.parent_order_id),
  };
}

/**
 * Kalemin ekran gösterimi.
 *
 * `supplierUnitPrice` TABAN fiyattır — özel talep farkı İÇERMEZ. Ekran ikisini
 * ayrı satırda gösterir ("ürün 40.000, talep farkı −10.000, toplam 30.000"):
 * ürünün kendi fiyatı sabit kalmalı, pazarlık ayrı okunmalı.
 *
 * Perakendecide kayıtlı fiyat her şey dahildir, taban için fark geri çıkarılır;
 * üreticide `supplier_unit_price` zaten farksız durur.
 */
export function toItem(raw: unknown, isRetailer: boolean): OrderItemRow {
  const i = nested(raw);
  const snap = nested(i.product_snapshot);
  const qty = num(i.quantity);
  const diff = num(i.price_difference);
  const allIn = isRetailer ? retailAllIn(i, diff) : undefined;

  const unitPrice =
    allIn !== undefined && allIn > 0 ? round2(allIn - diff) : num(i.supplier_unit_price);

  return {
    id: str(i.id),
    productId: nullable(i.product_id),
    name: str(snap.name) || '—',
    code: str(snap.code),
    quantity: qty,
    supplierUnitPrice: unitPrice,
    // Satır toplamı farkı İÇERİR; eskiden içermiyordu ve üretici görünümünde
    // kalem toplamı sipariş toplamıyla çelişiyordu (20.000 ↔ 10.000).
    totalPrice: round2((unitPrice + diff) * qty),
    customDescription: nullable(i.custom_description),
    priceDifference: num(i.price_difference),
  };
}
