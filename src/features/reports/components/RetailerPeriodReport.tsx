import { useState } from 'react';
import { formatMoney } from '@/lib/format';
import { Spinner } from '@/components/ui/Spinner';
import { ORDER_STATUS_META, type OrderStatus } from '@/features/orders';
import { BreakdownTable } from './BreakdownTable';
import { ReportRangePicker } from './ReportRangePicker';
import { useRetailerReport } from '../api/useRetailerReport';
import {
  byManufacturer,
  bySalesperson,
  byStatus,
  kpiOf,
  rangeFor,
  type DateRange,
  type RangePreset,
} from '../domain/retailerReport';

const statusLabel = (status: string): string =>
  ORDER_STATUS_META[status as OrderStatus]?.label ?? status;

const KpiCard = ({ label, value, accent }: { label: string; value: string; accent: string }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div className={`h-1 ${accent}`} />
    <div className="p-5">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
    </div>
  </div>
);

/** Perakendecinin dönem raporu — üretici, durum ve satışçı kırılımları. */
export function RetailerPeriodReport() {
  const [preset, setPreset] = useState<RangePreset | null>('this-month');
  const [range, setRange] = useState<DateRange>(() => rangeFor('this-month', new Date()));

  const report = useRetailerReport(range, Boolean(range.start && range.end));
  const orders = report.data ?? [];
  const kpi = kpiOf(orders);

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Raporlar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Seçtiğiniz dönemdeki siparişlerin üretici, durum ve satışçı kırılımı.
        </p>
      </div>

      <ReportRangePicker
        range={range}
        activePreset={preset}
        onPreset={(p) => {
          setPreset(p);
          setRange(rangeFor(p, new Date()));
        }}
        onRange={(r) => {
          setPreset(null);
          setRange(r);
        }}
      />

      {report.isPending ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : report.isError ? (
        <p role="alert" className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Rapor verileri yüklenemedi.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label="Toplam Sipariş" value={String(kpi.orderCount)} accent="bg-blue-500" />
            <KpiCard label="Toplam Tutar" value={formatMoney(kpi.total)} accent="bg-emerald-500" />
            <KpiCard label="Ortalama Sipariş" value={formatMoney(kpi.average)} accent="bg-slate-300" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BreakdownTable title="Üretici Bazlı" keyLabel="Üretici" rows={byManufacturer(orders)} />
            <BreakdownTable
              title="Durum Bazlı"
              keyLabel="Durum"
              rows={byStatus(orders, statusLabel)}
            />
          </div>

          <BreakdownTable title="Satışçı Bazlı" keyLabel="Satışçı" rows={bySalesperson(orders)} />

          <p className="text-xs text-slate-400">
            Tutarlar sizin satış fiyatlarınızdan (perakende) hesaplanır ve üreticiye iletilmez.
          </p>
        </>
      )}
    </div>
  );
}
