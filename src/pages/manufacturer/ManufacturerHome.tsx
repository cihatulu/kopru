import {
  DASHBOARD_ICONS as I,
  SummaryCard,
  toManufacturer,
  useDashboard,
} from '@/features/dashboard';
import { useAnnouncements } from '@/features/announcements';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { formatDateTime, formatMoney } from '@/lib/format';

/** Üretici Yönetim Paneli — YALNIZ KOMPOZİSYON (A20). */
export default function ManufacturerHome() {
  const summary = useDashboard();
  const announcements = useAnnouncements();

  if (summary.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const d = toManufacturer(summary.data ?? {});
  const latest = (announcements.data?.pages.flat() ?? []).slice(0, 4);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Üretici Yönetim Paneli"
        description="Satış ve operasyon verilerinizin anlık özeti"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <SummaryCard
          title="Toplam Ürün"
          value={String(d.productCount)}
          hint="Kayıtlı aktif ürün"
          icon={I.box}
          tone="neutral"
        />
        <SummaryCard
          title="Toplam Müşteri"
          value={String(d.partnerCount)}
          hint="Aktif bayileriniz"
          icon={I.users}
          tone="neutral"
        />
        <SummaryCard
          title="Bekleyen Sipariş"
          value={String(d.pendingOrders)}
          hint="Onay bekleyen sipariş"
          icon={I.cart}
          tone="attention"
        />
        <SummaryCard
          title="Bekleyen İade"
          value={String(d.pendingReturns)}
          hint="İnceleme bekleyen iade"
          icon={I.ret}
          tone="attention"
        />
        <SummaryCard
          title="Bekleyen SSH"
          value={String(d.pendingSsh)}
          hint="Çözüm bekleyen servis"
          icon={I.wrench}
          tone="attention"
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryCard
            title="Toplam Ciro (Net)"
            value={formatMoney(d.netRevenue)}
            hint="İptal ve iade hariç"
            icon={I.money}
            tone="positive"
          />
          <SummaryCard
            title="Onaylı İade Cirosu"
            value={formatMoney(d.returnedAmount)}
            hint="Kabul edilen iade tutarı"
            icon={I.ret}
            tone="negative"
          />
          <SummaryCard
            title="Onaylı İade Adedi"
            value={String(d.approvedReturns)}
            hint="Kabul edilen iadeler"
            icon={I.ret}
            tone="negative"
          />
          <SummaryCard
            title="Tamamlanan SSH"
            value={String(d.completedSsh)}
            hint="Çözülen destek kayıtları"
            icon={I.check}
            tone="positive"
          />
        </div>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-2 rounded-full bg-blue-500" />
            <h2 className="text-sm font-extrabold text-slate-900">Son Duyurular</h2>
          </div>
          {latest.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-2">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-slate-400">
                Henüz yayınlanmış bir duyurunuz bulunmuyor.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {latest.map((a) => (
                <li key={a.id} className="border-b border-slate-100 pb-3 last:border-0">
                  <p className="text-xs font-bold text-slate-900">{a.title}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-400">{formatDateTime(a.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
