import { DASHBOARD_ICONS as I, SummaryCard, toRetailer, useDashboard } from '@/features/dashboard';
import { useAnnouncements } from '@/features/announcements';
import { Spinner } from '@/components/ui/Spinner';
import { formatDateTime, formatMoney } from '@/lib/format';

/** Perakendeci Yönetim Paneli — YALNIZ KOMPOZİSYON (A20). */
export default function RetailerHome() {
  const summary = useDashboard();
  const announcements = useAnnouncements();

  if (summary.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const d = toRetailer(summary.data ?? {});
  const latest = (announcements.data?.pages.flat() ?? []).slice(0, 4);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Perakendeci Yönetim Paneli
        </h1>
        <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          Alım ve operasyon verilerinizin anlık özeti
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Tedarikçi"
          value={String(d.supplierCount)}
          hint="Aktif ticari ilişki"
          icon={I.users}
          tone="purple"
        />
        <SummaryCard
          title="Açık Sipariş"
          value={String(d.openOrders)}
          hint="Teslim edilmemiş sipariş"
          icon={I.cart}
          tone="amber"
        />
        <SummaryCard
          title="Bekleyen İade"
          value={String(d.pendingReturns)}
          hint="Karar bekleyen iade"
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
          title="Toplam Alım"
          value={formatMoney(d.purchaseTotal)}
          hint="İptal ve iade hariç"
          icon={I.money}
          tone="blue"
        />
        <SummaryCard
          title="Toplam Borç"
          value={formatMoney(d.totalDebt)}
          hint="Tüm tedarikçilere"
          icon={I.wallet}
          tone="emerald"
        />

        <section className="rounded-2xl bg-white p-6 ring-1 ring-inset ring-slate-200">
          <h2 className="text-base font-bold text-slate-900">Son Duyurular</h2>
          {latest.length === 0 ? (
            <p className="py-12 text-center text-sm italic text-slate-400">
              Tedarikçilerinizin yayınladığı duyuru bulunmuyor.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {latest.map((a) => (
                <li key={a.id} className="border-b border-slate-100 pb-3 last:border-0">
                  <p className="text-sm font-medium text-slate-900">{a.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {a.ownerName} · {formatDateTime(a.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
