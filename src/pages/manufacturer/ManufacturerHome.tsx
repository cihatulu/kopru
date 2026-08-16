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

      {/*
        Kartlar duyuru kartıyla AYNI grid'i paylaşmaz.

        Önce dört kart tek grid'de duruyor, duyuru kartı da `row-span-2` ile
        iki satıra yayılıyordu. Grid satırını yayılan öğe belirlediği için
        duyuru sayısı arttıkça kartlar da uzuyor, rakam boşluğun ortasında
        yalnız kalıyordu. Kartlar kendi iç grid'ine alınınca bağ koptu:
        yükseklik artık yalnız kartın kendi içeriğinden gelir.
      */}
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

        <section className="rounded-2xl bg-white p-6 ring-1 ring-inset ring-slate-200">
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
      </div>
    </div>
  );
}
