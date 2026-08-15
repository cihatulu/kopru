// features/stock PUBLIC YÜZEYİ (A20) — stok yönetimi.

export { useStockList } from './api/useStockList';
export type { StockRow } from './api/useStockList';
export { useSetProductStock, useBulkUpdateStock } from './api/useStockMutations';
export type { BulkStockResult } from './api/useStockMutations';

export { useRetailerStockList } from './api/useRetailerStockList';
export type { RetailerStockRow } from './api/useRetailerStockList';
export {
  useSetRetailerStock,
  useBulkUpdateRetailerStock,
} from './api/useRetailerStockMutations';
export {
  EMPTY_STOCK_FILTERS,
  filterStockRows,
  isStockFilterActive,
} from './domain/retailerStockFilter';
export type { StockFilters } from './domain/retailerStockFilter';
export { RetailerStockTable } from './components/RetailerStockTable';

export { parseCsv, toCsv, parseQuantity, CSV_HEADERS } from './domain/csv';
export type { StockCsvRow, ParsedCsv } from './domain/csv';

export { toStockCsv } from './domain/stockCsv';
export {
  uniqueCategories,
  filterByCategory,
  pageCount,
  pageSlice,
  clampPage,
} from './domain/stockPaging';

export { StockTable } from './components/StockTable';
export { CsvImportDialog } from './components/CsvImportDialog';
export { StockHeader } from './components/StockHeader';
export { StockToolbar } from './components/StockToolbar';
export { StockHowToBanner } from './components/StockHowToBanner';
