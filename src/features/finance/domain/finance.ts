/** Finans defteri mantığı — SAF (A20). */

export type FinanceKind = 'income' | 'expense';
export type PaymentMethod = 'cash' | 'pos_own' | 'pos_manufacturer' | 'bank_transfer';

export const FINANCE_KIND_LABELS: Record<FinanceKind, string> = {
  income: 'Gelir',
  expense: 'Gider',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Nakit',
  pos_own: 'Bizim POS (Banka)',
  pos_manufacturer: 'Üretici POS',
  bank_transfer: 'Havale/EFT',
};

export interface FinanceTotals {
  income: number;
  expense: number;
  net: number;
}

/** Üretici adının okunabileceği iki yol: kaydın kendisi ya da bağlı sipariş. */
export interface ManufacturerNamed {
  manufacturer?: { company_name: string | null } | null;
  order?: { manufacturer?: { company_name: string | null } | null } | null;
}

/** Perakendecinin kasa/POS defteri satırı (`finance_entries`). */
export interface FinanceTransaction extends ManufacturerNamed {
  id: string;
  retailer_id: string;
  type: FinanceKind;
  method: PaymentMethod;
  amount: number;
  description: string | null;
  order_id: string | null;
  manufacturer_id: string | null;
  created_at: string;
  order?:
    | { customer_name: string | null; manufacturer?: { company_name: string | null } | null }
    | null;
}

/** Cari hesap hesaplamaları için gereken en küçük sipariş gösterimi. */
export interface MinimalOrder {
  id: string;
  orderNo: string;
  createdAt: string;
  parentOrderId: string | null;
  totalAmount: number;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  manufacturerName: string | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function financeTotals(
  entries: { kind: FinanceKind; amount: number }[],
): FinanceTotals {
  const income = round2(
    entries.filter((e) => e.kind === 'income').reduce((s, e) => s + e.amount, 0),
  );
  const expense = round2(
    entries.filter((e) => e.kind === 'expense').reduce((s, e) => s + e.amount, 0),
  );
  return { income, expense, net: round2(income - expense) };
}

export function affectsOwnCash(method: PaymentMethod): boolean {
  return method !== 'pos_manufacturer';
}

export function getManufacturerName(t: ManufacturerNamed): string {
  // `||` bilinçli: boş şirket adı da "yok" sayılır ve sipariş üzerinden aranır.
  return t.manufacturer?.company_name || t.order?.manufacturer?.company_name || '-';
}

// Sipariş iadelerini zaman tünelinde ve cari borç hesabında ayrıştırmak için yardımcılar
export function isReturnLogEntry(description: string | null | undefined): boolean {
  if (!description) return false;
  const desc = description.toLowerCase();
  return desc.includes('iade') || desc.includes('return');
}

export function computeReturnCreditsByOrder(
  transactions: readonly { order_id?: string | null; type: FinanceKind; amount: number; description?: string | null }[],
): Record<string, number> {
  return transactions.reduce<Record<string, number>>((acc, t) => {
    if (t.order_id && t.type === 'income' && isReturnLogEntry(t.description)) {
      acc[t.order_id] = (acc[t.order_id] || 0) + Number(t.amount);
    }
    return acc;
  }, {});
}

export function buildChildrenByParent<T extends { id: string; parentOrderId?: string | null }>(
  orders: readonly T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  orders.forEach((o) => {
    if (o.parentOrderId) {
      const list = map.get(o.parentOrderId) ?? [];
      list.push(o);
      map.set(o.parentOrderId, list);
    }
  });
  return map;
}

export function reconstructRootOrderDebt<T extends { id: string; totalAmount: number }>(
  root: T,
  childrenByParent: Map<string, T[]>,
  returnCreditsByOrder: Record<string, number>,
): number {
  const own = Number(root.totalAmount || 0) + (returnCreditsByOrder[root.id] || 0);
  const children = childrenByParent.get(root.id) ?? [];
  const childrenTotal = children.reduce(
    (sum, c) => sum + Number(c.totalAmount || 0) + (returnCreditsByOrder[c.id] || 0),
    0,
  );
  return own + childrenTotal;
}

export function computeRunningBalance<T>(
  items: T[],
  getSignedAmount: (item: T) => number,
): (T & { runningBalance: number })[] {
  if (!items.length) return [];
  let balance = 0;
  const result = [...items].reverse().map((item) => {
    balance += getSignedAmount(item);
    return { ...item, runningBalance: balance };
  });
  return result.reverse();
}
