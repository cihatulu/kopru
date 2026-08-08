// features/stock PUBLIC YÜZEYİ (A20) — stok yönetimi.

export { useStockList } from './api/useStockList';
export type { StockRow } from './api/useStockList';
export { useSetProductStock, useBulkUpdateStock } from './api/useStockMutations';

export { parseCsv, toCsv, parseQuantity, CSV_HEADERS } from './domain/csv';
export type { StockCsvRow, ParsedCsv } from './domain/csv';

export { StockTable } from './components/StockTable';
export { CsvImportDialog } from './components/CsvImportDialog';
