import type { FinanceTransaction } from './finance';

/**
 * Kasa ve POS özetleri.
 *
 * `useFinanceStats` adıyla api/ altında yaşıyordu ama içinde tek bir sorgu
 * yoktu — saf toplama. Buraya taşındı (A20).
 */
export interface FinanceStats {
  cash_balance: number;
  total_cash_income: number;
  total_cash_expense: number;
  total_pos_own: number;
  total_pos_manufacturer: number;
}

export const EMPTY_FINANCE_STATS: FinanceStats = {
  cash_balance: 0,
  total_cash_income: 0,
  total_cash_expense: 0,
  total_pos_own: 0,
  total_pos_manufacturer: 0,
};

/**
 * Defter satırlarından özetleri çıkarır.
 *
 * Kasa bakiyesi yalnız nakitten oluşur: POS tahsilatı bankaya gider, kasaya
 * girmez. Üretici POS'u ise perakendecinin parası hiç değildir — ayrı izlenir.
 */
export function computeFinanceStats(
  transactions: readonly FinanceTransaction[] | undefined,
): FinanceStats {
  if (!transactions) return { ...EMPTY_FINANCE_STATS };

  return transactions.reduce<FinanceStats>(
    (acc, t) => {
      const amt = Number(t.amount);
      const sign = t.type === 'income' ? 1 : -1;

      if (t.method === 'cash') {
        if (t.type === 'income') acc.total_cash_income += amt;
        else acc.total_cash_expense += amt;
        acc.cash_balance += sign * amt;
      } else if (t.method === 'pos_own') {
        acc.total_pos_own += sign * amt;
      } else if (t.method === 'pos_manufacturer') {
        acc.total_pos_manufacturer += sign * amt;
      }

      return acc;
    },
    { ...EMPTY_FINANCE_STATS },
  );
}
