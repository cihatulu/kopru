/**
 * Cari ekstre satırının saf gösterimi ve DB satırından dönüşümü.
 *
 * Bu dosya `api/` altında yaşıyordu; `domain/ledgerCsv.ts` buradan tip import
 * ettiği için domain → api bağımlılığı oluşuyordu (A20 ihlali). Mantık saf
 * olduğundan doğru yeri burası: react, supabase veya DOM bağımlılığı yok.
 */

type Row = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number => Number(v ?? 0);
const obj = (v: unknown): Row => (typeof v === 'object' && v !== null ? (v as Row) : {});

export interface LedgerItemSnapshot {
  name: string;
  code?: string | undefined;
  quantity: number;
  unitPrice?: number | undefined;
  total?: number | undefined;
  /** Müşterinin değişiklik talebi — üretim talimatı, fiyat taşımaz. */
  customDescription?: string | undefined;
  /** Özel talep için üreticinin eklediği birim ek ücret (eksi ise indirim). */
  priceDifference?: number | undefined;
}

export interface LedgerEntry {
  id: string;
  type: 'debit' | 'credit';
  amount: number;
  /** Bu satırdan sonraki bakiye. Bakiye SUM ile değil bundan okunur (A18). */
  balanceAfter: number;
  description: string;
  createdAt: string;
  orderId: string | null;
  orderNo?: string | null;
  itemsSnapshot?: LedgerItemSnapshot[] | undefined;
}

/**
 * Açıklamaya sipariş numarasını yerleştirir.
 *
 * DB'deki açıklama kimi kayıtlarda numarasız ("Sipariş"), kimilerinde kırık
 * ("Sipari") geliyor. Ekranda her satırın hangi siparişe ait olduğu
 * görünmeli, bu yüzden numara açıklamada yoksa biçime göre eklenir.
 */
function withOrderNo(description: string, orderNo: string | null): string {
  if (!orderNo || description.includes(orderNo)) return description;

  if (description === 'Sipariş' || description === 'Sipari') {
    return `Sipariş #${orderNo}`;
  }
  if (description.startsWith('Sipariş iptali')) {
    const rest = description.replace(/^Sipariş iptali:?\s*/i, '');
    return rest ? `Sipariş iptali: #${orderNo} (${rest})` : `Sipariş iptali: #${orderNo}`;
  }
  if (description.startsWith('İade')) {
    const rest = description.replace(/^İade:?\s*/i, '');
    return rest ? `Sipariş iadesi: #${orderNo} (${rest})` : `Sipariş iadesi: #${orderNo}`;
  }
  return `${description} (#${orderNo})`;
}

/** DB satırını ekstre satırına çevirir. */
export function toEntry(raw: unknown): LedgerEntry {
  const r = raw as Row;
  const orderData = obj(r.order);
  const orderNo = typeof orderData.order_no === 'string' ? orderData.order_no : null;

  const rawItems = Array.isArray(r.items_snapshot) ? r.items_snapshot : [];
  const itemsSnapshot: LedgerItemSnapshot[] = rawItems.map((itemRaw) => {
    const item = obj(itemRaw);
    return {
      name: str(item.name) || 'Ürün',
      code: str(item.code),
      quantity: num(item.quantity || 1),
      unitPrice: item.unit_price !== undefined ? num(item.unit_price) : undefined,
      total: item.total !== undefined ? num(item.total) : undefined,
      customDescription: str(item.custom_description) || undefined,
      priceDifference: item.price_difference ? num(item.price_difference) : undefined,
    };
  });

  return {
    id: str(r.id),
    type: r.type as 'debit' | 'credit',
    amount: num(r.amount),
    balanceAfter: num(r.balance_after),
    description: withOrderNo(str(r.description), orderNo),
    createdAt: str(r.created_at),
    orderId: typeof r.order_id === 'string' ? r.order_id : null,
    orderNo,
    itemsSnapshot: itemsSnapshot.length > 0 ? itemsSnapshot : undefined,
  };
}
