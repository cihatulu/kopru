// features/reports PUBLIC YÜZEYİ (A20).

export { useManufacturerSummary, useRetailerSummary, useSummaryFor } from './api/useSummary';
export type { ManufacturerSummary, RetailerSummary } from './api/useSummary';
export { manufacturerMargin, retailerProfit, averageOrder } from './domain/metrics';
export { StatCard } from './components/StatCard';
