// features/reports PUBLIC YÜZEYİ (A20).

export { useManufacturerSummary, useRetailerSummary, useSummaryFor } from './api/useSummary';
export type { ManufacturerSummary, RetailerSummary } from './api/useSummary';
export { useManufacturerReports } from './api/useManufacturerReports';
export type { ReportProduct, ReportOrderItem, ReportOrder, ReportSsh, ManufacturerReportsData } from './api/useManufacturerReports';
export { manufacturerMargin, retailerProfit, averageOrder } from './domain/metrics';
export { StatCard } from './components/StatCard';
