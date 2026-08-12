import { useEffect, useMemo, useState } from 'react';
import { computeRunningBalance, type FinanceTransaction, type PaymentMethod } from '../domain/finance';
import {
  EMPTY_LEDGER_FILTERS,
  EMPTY_TX_FILTERS,
  filterLedgers,
  filterTransactions,
  pageSlice,
  type FinanceTxRow,
  type LedgerFilters,
  type TxFilters,
} from '../domain/financeFilters';
import { useAllOrders, useCustomerLedgers, useFinanceTransactions, useManufacturers } from './useFinance';

export type FinanceTab = 'cash' | 'pos_own' | 'pos_manufacturer' | 'customers';

export const FINANCE_PAGE_SIZE = 50;

const signed = (t: FinanceTransaction) =>
  t.type === 'income' ? Number(t.amount) : -Number(t.amount);

/**
 * Finans ekranının durumu ve türetilmiş listeleri.
 *
 * Yürüyen bakiye SÜZGEÇTEN ÖNCE hesaplanır: bakiye satırın defterdeki sırasına
 * bağlıdır, aramaya göre değişemez. Önce süzülüp sonra hesaplansaydı ekranda
 * gerçekte var olmayan bir bakiye çıkardı.
 */
export function useFinancePage() {
  const [tab, setTab] = useState<FinanceTab>('cash');
  const [page, setPage] = useState(1);
  const [txFilters, setTxFilters] = useState<TxFilters>(EMPTY_TX_FILTERS);
  const [ledgerFilters, setLedgerFilters] = useState<LedgerFilters>(EMPTY_LEDGER_FILTERS);

  const transactions = useFinanceTransactions();
  const orders = useAllOrders();
  const manufacturers = useManufacturers();
  const ledgers = useCustomerLedgers(orders.data);

  useEffect(() => {
    setPage(1);
  }, [tab, txFilters, ledgerFilters]);

  const byMethod = useMemo(() => {
    const rows = transactions.data ?? [];
    const of = (method: PaymentMethod): FinanceTxRow[] =>
      computeRunningBalance(rows.filter((t) => t.method === method), signed);
    return {
      cash: of('cash'),
      pos_own: of('pos_own'),
      pos_manufacturer: of('pos_manufacturer'),
    };
  }, [transactions.data]);

  const filteredTx = useMemo(
    () => ({
      cash: filterTransactions(byMethod.cash, txFilters),
      pos_own: filterTransactions(byMethod.pos_own, txFilters),
      pos_manufacturer: filterTransactions(byMethod.pos_manufacturer, txFilters),
    }),
    [byMethod, txFilters],
  );

  const filteredLedgers = useMemo(
    () => filterLedgers(ledgers, ledgerFilters),
    [ledgers, ledgerFilters],
  );

  /** Sekmenin süzülmüş tamamı ve o sayfaya düşen dilimi. */
  const visible = <T,>(rows: T[]) => ({ total: rows.length, rows: pageSlice(rows, page, FINANCE_PAGE_SIZE) });

  return {
    tab,
    setTab,
    page,
    setPage,
    txFilters,
    setTxFilters,
    ledgerFilters,
    setLedgerFilters,
    isLoading: transactions.isLoading || orders.isLoading,
    transactions: transactions.data ?? [],
    orders: orders.data ?? [],
    manufacturers: manufacturers.data ?? [],
    ledgers,
    tx: {
      cash: visible(filteredTx.cash),
      pos_own: visible(filteredTx.pos_own),
      pos_manufacturer: visible(filteredTx.pos_manufacturer),
    },
    customers: visible(filteredLedgers),
  };
}
