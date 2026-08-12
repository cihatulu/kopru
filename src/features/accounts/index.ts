// features/accounts PUBLIC YÜZEYİ (A20).

export { useLedger, useBalance } from './api/useAccounts';
export {
  useRequestManualTransaction,
  usePendingRequests,
  useDecideRequest,
  type RequestMode,
  type PendingRequest,
} from './api/useManualTransactionRequests';
export {
  useUpdateManualTransaction,
  useDeleteManualTransaction,
} from './api/useManualTransactionEdits';
export { toEntry } from './domain/ledgerEntry';
export type { LedgerEntry, LedgerItemSnapshot } from './domain/ledgerEntry';

export { useLedgerSummary } from './api/useLedgerSummary';
export { useLedgerExport, EXPORT_LIMIT } from './api/useLedgerExport';
export { useLedgerAccounts } from './api/useLedgerAccounts';

export {
  BALANCE_LABEL,
  balanceSide,
  balanceSuffix,
  columnLabels,
  filterAccounts,
  filterEntries,
  manualEntryOptions,
} from './domain/accountView';
export type { AccountRow, BalanceSide } from './domain/accountView';

export {
  EMPTY_PERIOD,
  currentMonth,
  previousMonth,
  isPeriodActive,
  isPeriodInverted,
  isSummaryConsistent,
  toBounds,
} from './domain/period';
export type { Period, LedgerSummary } from './domain/period';
export { ledgerToCsv, ledgerFileName, LEDGER_HEADERS } from './domain/ledgerCsv';

export { AccountsTable } from './components/AccountsTable';
export { AccountDetailDialog } from './components/AccountDetailDialog';
export { LedgerTable } from './components/LedgerTable';
export { LedgerSection } from './components/LedgerSection';
export { ManualEntryPanel } from './components/ManualEntryPanel';
export { PendingRequestsPanel } from './components/PendingRequestsPanel';
export { PeriodBar } from './components/PeriodBar';
export { SummaryCards } from './components/SummaryCards';
