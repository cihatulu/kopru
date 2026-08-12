import { formatMoney } from '@/lib/format';
import { Spinner } from '@/components/ui/Spinner';
import { StatCard } from './StatCard';
import { averageOrder, retailerProfit } from '../domain/metrics';
import type { RetailerSummary } from '../api/useSummary';

interface Props {
  data: RetailerSummary | undefined;
  isPending: boolean;
}

/** Perakendecinin rapor görünümü — kâr KATMAN 3'ten hesaplanır, yalnız o görür (A4). */
export function RetailerReportSummary({ data, isPending }: Props) {
  if (isPending) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }
  if (!data) return null;

  const profit = retailerProfit(data.purchaseTotal, data.expectedRevenue);
  const hasProfit = profit.percent !== null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Sipariş" value={String(data.orderCount)} />
      <StatCard label="Alım tutarı" value={formatMoney(data.purchaseTotal)} />
      <StatCard
        label="Beklenen kâr"
        value={hasProfit ? formatMoney(profit.profit) : '—'}
        tone={hasProfit ? 'positive' : 'muted'}
        hint={
          hasProfit
            ? `Kâr oranı %${profit.percent}`
            : 'Sepette satış fiyatı girerseniz hesaplanır'
        }
      />
      <StatCard
        label="Ortalama sipariş"
        value={formatMoney(averageOrder(data.purchaseTotal, data.orderCount))}
        hint={`${data.supplierCount} tedarikçi`}
      />
    </div>
  );
}
