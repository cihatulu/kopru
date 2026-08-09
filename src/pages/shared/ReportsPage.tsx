import {
  StatCard,
  averageOrder,
  manufacturerMargin,
  retailerProfit,
  useSummaryFor,
} from '@/features/reports';
import { useAuthSession } from '@/features/auth';
import { Spinner } from '@/components/ui/Spinner';
import { formatMoney } from '@/lib/format';
import { ORG_KIND } from '@/constants';

/** Son 30 günün özeti — YALNIZ KOMPOZİSYON (A20). */
export default function ReportsPage() {
  const { data: user } = useAuthSession();
  const { manufacturer, retailer } = useSummaryFor(user?.org?.kind);

  if (!user?.org) return null;
  const isManufacturer = user.org.kind === ORG_KIND.manufacturer;
  const active = isManufacturer ? manufacturer : retailer;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Raporlar</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Son 30 gün. İptal ve iade edilen siparişler hariç tutulur.{' '}
          {isManufacturer
            ? 'Maliyet ve marj yalnız size görünür.'
            : 'Beklenen ciro ve kâr yalnız size görünür.'}
        </p>
      </div>

      {active.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : isManufacturer && manufacturer.data ? (
        <ManufacturerCards data={manufacturer.data} />
      ) : retailer.data ? (
        <RetailerCards data={retailer.data} />
      ) : null}
    </div>
  );
}

function ManufacturerCards({
  data,
}: {
  data: NonNullable<ReturnType<typeof useSummaryFor>['manufacturer']['data']>;
}) {
  const margin = manufacturerMargin(data.revenue, data.cost);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Sipariş" value={String(data.orderCount)} />
      <StatCard label="Ciro" value={formatMoney(data.revenue)} />
      <StatCard
        label="Brüt kâr"
        value={formatMoney(margin.profit)}
        tone={margin.profit >= 0 ? 'positive' : 'default'}
        hint={
          margin.percent === null ? 'Marj için ürün maliyetlerini girin' : `Marj %${margin.percent}`
        }
      />
      <StatCard
        label="Ortalama sipariş"
        value={formatMoney(averageOrder(data.revenue, data.orderCount))}
        hint={`${data.customerCount} müşteri`}
      />
    </div>
  );
}

function RetailerCards({
  data,
}: {
  data: NonNullable<ReturnType<typeof useSummaryFor>['retailer']['data']>;
}) {
  const profit = retailerProfit(data.purchaseTotal, data.expectedRevenue);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Sipariş" value={String(data.orderCount)} />
      <StatCard label="Alım tutarı" value={formatMoney(data.purchaseTotal)} />
      <StatCard
        label="Beklenen kâr"
        value={profit.percent === null ? '—' : formatMoney(profit.profit)}
        tone={profit.percent === null ? 'muted' : 'positive'}
        hint={
          profit.percent === null
            ? 'Sepette satış fiyatı girerseniz hesaplanır'
            : `Kâr oranı %${profit.percent}`
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
