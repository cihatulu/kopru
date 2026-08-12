// features/finance PUBLIC YÜZEYİ (A20).

export {
  useFinanceTransactions,
  useAllOrders,
  useManufacturers,
  useFinanceStats,
  useCustomerLedgers,
} from './api/useFinance';
export { useAddFinanceTransaction } from './api/useFinanceMutations';
export type { FinanceTransaction, MinimalOrder } from './domain/finance';
export type { FinanceStats } from './domain/financeStats';
export type { CustomerLedger } from './domain/customerLedger';
export {
  financeTotals,
  affectsOwnCash,
  FINANCE_KIND_LABELS,
  PAYMENT_METHOD_LABELS,
  getManufacturerName,
  computeRunningBalance,
} from './domain/finance';
export type { FinanceKind, PaymentMethod, FinanceTotals } from './domain/finance';

export { IncomeModal } from './components/IncomeModal';
export { ExpenseModal } from './components/ExpenseModal';
export { CustomerPaymentModal } from './components/CustomerPaymentModal';
export { CustomerLedgerDetail } from './components/CustomerLedgerDetail';
export { default as FinancePage } from '@/pages/retailer/FinancePage';
