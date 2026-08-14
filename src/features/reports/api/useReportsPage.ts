import { useMemo, useState } from 'react';
import {
  categoriesOf,
  productQuantityByStatus,
  retailersOf,
  sshDensity,
  topCustomers,
  topProducts,
} from '../domain/reportAggregates';
import {
  EMPTY_PROFIT_FILTERS,
  kpiSummary,
  profitTotals,
  profitabilityRows,
  type ProfitFilters,
} from '../domain/profitability';
import { useManufacturerReports } from './useManufacturerReports';
import type { ManufacturerReportsData } from '../domain/reportTypes';

const EMPTY: ManufacturerReportsData = {
  products: [],
  costs: new Map(),
  orders: [],
  sshRequests: [],
};

export type ReportTab = 'overview' | 'profitability';

/** Üretici rapor ekranının tüm türetilmiş verisi ve süzgeç durumu. */
export function useReportsPage(myOrgId: string | undefined, enabled: boolean) {
  const query = useManufacturerReports(myOrgId, enabled);
  const [tab, setTab] = useState<ReportTab>('overview');
  const [filters, setFilters] = useState<ProfitFilters>(EMPTY_PROFIT_FILTERS);

  const data = query.data ?? EMPTY;

  const lists = useMemo(
    () => ({
      customers: topCustomers(data),
      products: topProducts(data),
      ssh: sshDensity(data),
      cancelled: productQuantityByStatus(data, 'cancelled'),
      returned: productQuantityByStatus(data, 'returned'),
      categories: categoriesOf(data),
      retailers: retailersOf(data),
      kpi: kpiSummary(data),
    }),
    [data],
  );

  const profitRows = useMemo(() => profitabilityRows(data, filters), [data, filters]);

  return {
    query,
    tab,
    setTab,
    filters,
    setFilters,
    resetFilters: () => setFilters(EMPTY_PROFIT_FILTERS),
    ...lists,
    profitRows,
    profitTotals: useMemo(() => profitTotals(profitRows), [profitRows]),
  };
}
