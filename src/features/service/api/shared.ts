// SSH ve iade sorgularının ortak parçaları.
// Açık kolon listeleri (kilitli kural 19); gizli fiyat katmanları burada yok (A4).

export const SSH_COLUMNS =
  'id, title, description, status, created_at, order_id, customer_name, customer_phone, ' +
  'manufacturer_org_id, retailer_org_id, relationship_id, ' +
  'orders(order_no), ' +
  'manufacturer:manufacturer_org_id(company_name), retailer:retailer_org_id(company_name)';

export const RETURN_COLUMNS =
  'id, status, reason, items, approved_amount, created_at, decided_at, order_id, ' +
  'manufacturer_org_id, retailer_org_id, relationship_id, ' +
  'orders(order_no, order_items(id, product_snapshot)), manufacturer:manufacturer_org_id(company_name), ' +
  'retailer:retailer_org_id(company_name)';

export type SshStatus = 'bekliyor' | 'inceleniyor' | 'parca_gonderildi' | 'tamamlandi' | 'iptal';
export type ReturnStatus = 'pending' | 'approved' | 'rejected';

export type Row = Record<string, unknown>;

export const str = (v: unknown): string => (typeof v === 'string' ? v : '');
export const nullableStr = (v: unknown): string | null => (typeof v === 'string' ? v : null);
export const nested = (v: unknown): Row => (v && typeof v === 'object' ? (v as Row) : {});

/** Kenarın bana göre karşı ucu — sorgu iki ucu da çeker, çeviri burada olur. */
export function counterpartyName(r: Row, myOrgId: string): string {
  const mfr = Array.isArray(r.manufacturer) ? nested(r.manufacturer[0]) : nested(r.manufacturer);
  const rtl = Array.isArray(r.retailer) ? nested(r.retailer[0]) : nested(r.retailer);
  const other = r.manufacturer_org_id === myOrgId ? rtl : mfr;
  return str(other.company_name) || '—';
}

export interface Cursor {
  createdAt: string;
  id: string;
}

/** Keyset filtresi (A17) — eşit zaman damgalarını da kapsar. */
export function keyset(cursor: Cursor): string {
  return `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`;
}

export function next<T extends Cursor>(rows: T[], pageSize: number): Cursor | undefined {
  if (rows.length < pageSize) return undefined;
  const l = rows[rows.length - 1];
  return l ? { createdAt: l.createdAt, id: l.id } : undefined;
}
