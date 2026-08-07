/** Finans defteri mantığı — SAF (A20). */

export type FinanceKind = 'income' | 'expense';
export type PaymentMethod = 'cash' | 'pos_own' | 'pos_manufacturer' | 'bank_transfer';

export const FINANCE_KIND_LABELS: Record<FinanceKind, string> = {
  income: 'Gelir',
  expense: 'Gider',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Nakit',
  pos_own: 'Kendi POS',
  pos_manufacturer: 'Üretici POS',
  bank_transfer: 'Havale/EFT',
};

export interface FinanceTotals {
  income: number;
  expense: number;
  net: number;
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

/**
 * Üretici POS'u ile yapılan tahsilat işletmenin kasasına GİRMEZ; para doğrudan
 * üreticiye gider ve cari borcu düşer. Nakit akışında ayrı gösterilmesi gerekir,
 * aksi halde kasa fazla görünür.
 */
export function affectsOwnCash(method: PaymentMethod): boolean {
  return method !== 'pos_manufacturer';
}
