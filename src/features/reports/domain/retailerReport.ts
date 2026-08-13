/** Perakendeci raporunun kırılımları ve dönem hesabı — SAF (A20). */

export interface RetailerReportOrder {
  id: string;
  status: string;
  createdAt: string;
  /** Perakendecinin kendi satış tutarı (KATMAN 3); yoksa üretici tutarına düşer. */
  total: number;
  manufacturerName: string;
  salespersonId: string | null;
  salespersonName: string;
}

export interface BreakdownRow {
  key: string;
  label: string;
  orderCount: number;
  total: number;
}

export interface ReportKpi {
  orderCount: number;
  total: number;
  average: number;
}

export type RangePreset = 'this-month' | 'last-month' | 'this-year';

export interface DateRange {
  /** `yyyy-mm-dd` — gün bazlı, saat dilimi karışıklığı olmasın diye metin. */
  start: string;
  end: string;
}

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Ayın son günü: bir sonraki ayın 0'ıncı günü. */
const lastDayOf = (year: number, month: number) => new Date(year, month + 1, 0);

export function rangeFor(preset: RangePreset, now: Date): DateRange {
  const y = now.getFullYear();
  const m = now.getMonth();

  if (preset === 'this-month') {
    return { start: iso(new Date(y, m, 1)), end: iso(lastDayOf(y, m)) };
  }
  if (preset === 'last-month') {
    // Ocak'ta bir önceki ay Aralık'tır; Date bunu kendisi taşır.
    return { start: iso(new Date(y, m - 1, 1)), end: iso(lastDayOf(y, m - 1)) };
  }
  return { start: iso(new Date(y, 0, 1)), end: iso(new Date(y, 11, 31)) };
}

export function kpiOf(orders: RetailerReportOrder[]): ReportKpi {
  const total = orders.reduce((sum, o) => sum + o.total, 0);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    orderCount: orders.length,
    total: round2(total),
    // Sipariş yokken ortalama SIFIRDIR; 0/0 = NaN ekrana çıkmasın.
    average: orders.length === 0 ? 0 : round2(total / orders.length),
  };
}

function group(
  orders: RetailerReportOrder[],
  keyOf: (o: RetailerReportOrder) => string,
  labelOf: (o: RetailerReportOrder) => string,
): BreakdownRow[] {
  const rows = new Map<string, BreakdownRow>();

  for (const o of orders) {
    const key = keyOf(o);
    const prev = rows.get(key);
    rows.set(key, {
      key,
      label: labelOf(o),
      orderCount: (prev?.orderCount ?? 0) + 1,
      total: (prev?.total ?? 0) + o.total,
    });
  }

  return [...rows.values()]
    .map((r) => ({ ...r, total: Math.round(r.total * 100) / 100 }))
    .sort((a, b) => b.total - a.total || b.orderCount - a.orderCount);
}

export const byManufacturer = (orders: RetailerReportOrder[]): BreakdownRow[] =>
  group(orders, (o) => o.manufacturerName, (o) => o.manufacturerName);

export const bySalesperson = (orders: RetailerReportOrder[]): BreakdownRow[] =>
  group(orders, (o) => o.salespersonId ?? 'yok', (o) => o.salespersonName);

/** Durum etiketi dışarıdan verilir; domain arayüz sözlüğüne bağlanmaz. */
export const byStatus = (
  orders: RetailerReportOrder[],
  labelOf: (status: string) => string,
): BreakdownRow[] => group(orders, (o) => o.status, (o) => labelOf(o.status));
