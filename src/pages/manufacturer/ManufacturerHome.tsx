import {
  DASHBOARD_ICONS as I,
  SummaryCard,
  toManufacturer,
  useDashboard,
} from '@/features/dashboard';
import { useAnnouncements } from '@/features/announcements';
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
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Üretici Yönetim Paneli
        </h1>
        <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          Satış ve operasyon verilerinizin anlık özeti
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <SummaryCard
          title="Toplam Ürün"
          value={String(d.productCount)}
          hint="Kayıtlı aktif ürün"
          icon={I.box}
          tone="blue"
        />
        <SummaryCard
          title="Toplam Müşteri"
          value={String(d.partnerCount)}
          hint="Aktif bayileriniz"
          icon={I.users}
          tone="purple"
        />
        <SummaryCard
          title="Bekleyen Sipariş"
          value={String(d.pendingOrders)}
          hint="Onay bekleyen sipariş"
          icon={I.cart}
          tone="amber"
        />
        <SummaryCard
          title="Bekleyen İade"
          value={String(d.pendingReturns)}
          hint="İnceleme bekleyen iade"
          icon={I.ret}
          tone="rose"
        />
        <SummaryCard
          title="Bekleyen SSH"
          value={String(d.pendingSsh)}
          hint="Çözüm bekleyen servis"
          icon={I.wrench}
          tone="yellow"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[repeat(2,minmax(0,1fr))_2fr]">
        <SummaryCard
          title="Toplam Ciro (Net)"
          value={formatMoney(d.netRevenue)}
          hint="İptal ve iade hariç"
          icon={I.money}
          tone="emerald"
        />
        <SummaryCard
          title="Onaylı İade Cirosu"
          value={formatMoney(d.returnedAmount)}
          hint="Kabul edilen iade tutarı"
          icon={I.ret}
          tone="rose"
        />

        <section className="rounded-2xl bg-white p-6 ring-1 ring-inset ring-slate-200 lg:row-span-2">
          <h2 className="text-base font-bold text-slate-900">Son Duyurular</h2>
          {latest.length === 0 ? (
            <p className="py-12 text-center text-sm italic text-slate-400">
              Henüz yayınlanmış bir duyurunuz bulunmuyor.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {latest.map((a) => (
                <li key={a.id} className="border-b border-slate-100 pb-3 last:border-0">
                  <p className="text-sm font-medium text-slate-900">{a.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(a.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <SummaryCard
          title="Onaylı İade Adedi"
          value={String(d.approvedReturns)}
          hint="Kabul edilen iadeler"
          icon={I.ret}
          tone="pink"
        />
        <SummaryCard
          title="Tamamlanan SSH"
          value={String(d.completedSsh)}
          hint="Çözülen destek kayıtları"
          icon={I.check}
          tone="teal"
        />
      </div>
    </div>
  );
}
