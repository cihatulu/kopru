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

/** Gömülü tek satırlık diziden ilk kaydı okur. */
function firstOf(v: unknown): Row | undefined {
  const arr = Array.isArray(v) ? (v as unknown[]) : [];
  return arr.length > 0 ? nested(arr[0]) : undefined;
}

/**
 * Kalemin perakende birim fiyatı.
 *
 * Öncelik sipariş anında düşülen kayıttadır; yoksa ürünün güncel perakende
 * fiyatına düşülür. Hiçbiri yoksa undefined — çağıran üretici fiyatını kullanır.
 */
function retailUnitPrice(item: Row): number | undefined {
  const recorded = firstOf(item.order_item_retail_prices);
  if (recorded) {
    const price = num(recorded.retail_unit_price);
    if (price > 0) return price;
  }

  const current = firstOf(nested(item.products).retail_prices);
  if (current) {
    const price = num(current.retail_price);
    if (price > 0) return price;
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
      const price = retailUnitPrice(item);
      if (price !== undefined && price > 0) {
        retailTotal += price * qty;
        hasRetail = true;
      } else {
        retailTotal += num(item.supplier_unit_price) * qty;
      }
    }
    if (hasRetail && retailTotal > 0) totalAmount = Math.round(retailTotal * 100) / 100;
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

export function toItem(raw: unknown, isRetailer: boolean): OrderItemRow {
  const i = nested(raw);
  const snap = nested(i.product_snapshot);
  const retail = retailUnitPrice(i);

  const unitPrice =
    isRetailer && retail !== undefined && retail > 0 ? retail : num(i.supplier_unit_price);
  const qty = num(i.quantity);

  return {
    id: str(i.id),
    productId: nullable(i.product_id),
    name: str(snap.name) || '—',
    code: str(snap.code),
    quantity: qty,
    supplierUnitPrice: unitPrice,
    totalPrice: Math.round(unitPrice * qty * 100) / 100,
    customDescription: nullable(i.custom_description),
  };
}
