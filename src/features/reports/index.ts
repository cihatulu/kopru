// features/reports PUBLIC YÜZEYİ (A20).

export { useManufacturerSummary, useRetailerSummary, useSummaryFor } from './api/useSummary';
export type { ManufacturerSummary, RetailerSummary } from './api/useSummary';
export { useManufacturerReports } from './api/useManufacturerReports';
export { useReportsPage } from './api/useReportsPage';
export type { ReportTab } from './api/useReportsPage';
export { useRetailerReport } from './api/useRetailerReport';

export {
  byManufacturer,
  bySalesperson,
  byStatus,
  kpiOf,
  rangeFor,
} from './domain/retailerReport';
export type {
  BreakdownRow,
  DateRange,
  RangePreset,
  ReportKpi,
  RetailerReportOrder,
} from './domain/retailerReport';

export { manufacturerMargin, retailerProfit, averageOrder } from './domain/metrics';
export type {
  ReportProduct,
  ReportOrderItem,
  ReportOrder,
  ReportSsh,
  ManufacturerReportsData,
} from './domain/reportTypes';
export type { ReportKind, ReportSources } from './domain/reportColumns';
export {
  kpiSummary,
  marginPercent,
  monthlyRevenue,
  profitabilityRows,
  profitTotals,
} from './domain/profitability';
export type { ProfitFilters, ProfitRow, Kpi, MonthPoint } from './domain/profitability';

export { StatCard } from './components/StatCard';
export { MonthlyBarChart } from './components/MonthlyBarChart';
export { ReportKpiCards } from './components/ReportKpiCards';
export { ReportOverview } from './components/ReportOverview';
export { ReportDetailModal } from './components/ReportDetailModal';
export { ProfitabilityTab } from './components/ProfitabilityTab';
export { RetailerReportSummary } from './components/RetailerReportSummary';
export { RetailerPeriodReport } from './components/RetailerPeriodReport';
export { BreakdownTable } from './components/BreakdownTable';
export { ReportRangePicker } from './components/ReportRangePicker';
