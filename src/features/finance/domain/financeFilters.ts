/** Finans ekranının süzgeçleri — SAF (A20). */
import { formatDateTime } from '@/lib/format';
import { getManufacturerName, type FinanceTransaction } from './finance';
import type { CustomerLedger } from './customerLedger';

/** Yürüyen bakiyesi hesaplanmış defter satırı. */
export type FinanceTxRow = FinanceTransaction & { runningBalance: number };

export interface TxFilters {
  date: string;
  customerName: string;
  manufacturerName: string;
}

export interface LedgerFilters {
  customerName: string;
  customerPhone: string;
  manufacturerName: string;
}

export const EMPTY_TX_FILTERS: TxFilters = { date: '', customerName: '', manufacturerName: '' };
export const EMPTY_LEDGER_FILTERS: LedgerFilters = {
  customerName: '',
  customerPhone: '',
  manufacturerName: '',
};

const has = (haystack: string | null | undefined, needle: string): boolean =>
  !needle || (haystack ?? '').toLowerCase().includes(needle.toLowerCase());

/** Tarih, kullanıcıya GÖSTERİLDİĞİ biçim üzerinden aranır — yazdığı buysa. */
export function filterTransactions(rows: FinanceTxRow[], f: TxFilters): FinanceTxRow[] {
  return rows.filter(
    (t) =>
      has(formatDateTime(t.created_at), f.date) &&
      has(t.order?.customer_name, f.customerName) &&
      has(getManufacturerName(t), f.manufacturerName),
  );
}

export function filterLedgers(rows: CustomerLedger[], f: LedgerFilters): CustomerLedger[] {
  return rows.filter(
    (l) =>
      has(l.customer_name, f.customerName) &&
      has(l.customer_phone, f.customerPhone) &&
      has(l.manufacturer_names.join(', '), f.manufacturerName),
  );
}

/** İstemci tarafı dilimleme — liste zaten bellekte, sunucuda OFFSET yok (A17). */
export function pageSlice<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}
