// features/finance PUBLIC YÜZEYİ (A20).

export {
  useFinanceTransactions,
  useAllOrders,
  useManufacturers,
  useApprovedReturnRequests,
  useFinanceStats,
  useCustomerLedgers,
} from './api/useFinance';
export { useAddFinanceTransaction } from './api/useFinanceMutations';
export { useFinancePage, FINANCE_PAGE_SIZE } from './api/useFinancePage';
export type { FinanceTab } from './api/useFinancePage';

export type { FinanceTransaction, MinimalOrder } from './domain/finance';
export type { FinanceStats } from './domain/financeStats';
export { computeFinanceStats } from './domain/financeStats';
export type { CustomerLedger } from './domain/customerLedger';
export { customerLedgerKey } from './domain/customerLedger';
export {
  financeTotals,
  affectsOwnCash,
  FINANCE_KIND_LABELS,
  PAYMENT_METHOD_LABELS,
  getManufacturerName,
  computeRunningBalance,
} from './domain/finance';
export type { FinanceKind, PaymentMethod, FinanceTotals } from './domain/finance';
export { filterLedgers, filterTransactions, pageSlice } from './domain/financeFilters';
export type { FinanceTxRow, LedgerFilters, TxFilters } from './domain/financeFilters';

export { IncomeModal } from './components/IncomeModal';
export { ExpenseModal } from './components/ExpenseModal';
export { CustomerPaymentModal } from './components/CustomerPaymentModal';
export { CustomerInfoModal } from './components/CustomerInfoModal';
export { CustomerLedgerDetail } from './components/CustomerLedgerDetail';
export { CustomerLedgerTable } from './components/CustomerLedgerTable';
export { FinanceFilterBar } from './components/FinanceFilterBar';
export { FinanceSummary } from './components/FinanceSummary';
export { FinanceTabs } from './components/FinanceTabs';
export { FinanceToolbar } from './components/FinanceToolbar';
export type { PaymentTarget } from './components/FinanceToolbar';
export { FinanceTxTable } from './components/FinanceTxTable';
export { FinanceModals } from './components/FinanceModals';
export type { FinanceModalKind, FinanceEntryDraft } from './components/FinanceModals';
