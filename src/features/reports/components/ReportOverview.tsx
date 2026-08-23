import { formatMoney } from '@/lib/format';
import { ReportKpiCards } from './ReportKpiCards';
import { EmptyNote, ProductThumb, RankBadge, ReportCard, RowShell } from './ReportCard';
import type { useReportsPage } from '../api/useReportsPage';
import type { ReportKind } from '../domain/reportColumns';

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-amber-600 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

interface Props {
  page: ReturnType<typeof useReportsPage>;
  onOpenReport: (kind: ReportKind) => void;
}

export function ReportOverview({ page, onOpenReport }: Props) {
  return (
    <div className="space-y-4">
      <ReportKpiCards kpi={page.kpi} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportCard
          title="En Çok Satın Alan Müşteriler"
          accent="bg-blue-500"
          actionLabel="Tümünü Gör"
          onAction={() => onOpenReport('customers')}
        >
          {page.customers.length === 0 && <EmptyNote>Yeterli veri bulunamadı.</EmptyNote>}
          {page.customers.slice(0, 3).map((item, i) => (
            <RowShell key={item.id}>
              <div className="flex items-center gap-2.5">
                <RankBadge index={i} tone="bg-blue-50 text-blue-600 border border-blue-100" />
                <p className="font-bold text-slate-800 text-xs">{item.companyName}</p>
              </div>
              <p className="font-extrabold text-slate-900 text-xs">{formatMoney(item.totalAmount)}</p>
            </RowShell>
          ))}
        </ReportCard>

        <ReportCard
          title="En Çok Satan Ürünler"
          accent="bg-amber-500"
          actionLabel="Detaylı Rapor"
          onAction={() => onOpenReport('products')}
        >
          {page.products.length === 0 && <EmptyNote>Yeterli veri bulunamadı.</EmptyNote>}
          {page.products.slice(0, 3).map((item, i) => (
            <RowShell key={item.id}>
              <div className="flex items-center gap-2.5">
                <RankBadge index={i} tone="bg-amber-50 text-amber-700 border border-amber-100" />
                <ProductThumb product={item.product} />
                <div>
                  <p className="font-bold text-slate-800 text-xs">{item.product.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{item.product.code}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-slate-900 text-xs">{item.quantity} Adet</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                  Kâr: {formatMoney(item.profit)}
                </p>
              </div>
            </RowShell>
          ))}
        </ReportCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportCard
          title="SSH & Arıza Yoğunluk Analizi"
          accent="bg-red-500"
          actionLabel="Tümünü Gör"
          onAction={() => onOpenReport('ssh')}
        >
          <div className="bg-amber-50/60 border border-amber-200/60 p-2 rounded-xl mb-2 flex items-center gap-2">
            <InfoIcon />
            <p className="text-[11px] text-amber-900 font-semibold">
              SSH taleplerinde <strong className="font-extrabold">seçilen</strong> ürünlerin arıza sıklığı.
            </p>
          </div>

          {page.ssh.length === 0 && <EmptyNote>Henüz SSH verisi oluşmadı.</EmptyNote>}
          {page.ssh.slice(0, 3).map((item) => (
            <RowShell key={item.id}>
              <div className="flex items-center gap-2.5">
                <ProductThumb product={item.product} />
                <div>
                  <p className="font-bold text-slate-800 text-xs">{item.product.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {item.product.category || 'Kategorisiz'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-right">
                <div>
                  <span className="text-[9px] text-slate-400 block font-semibold">Tavsiye</span>
                  <span
                    className={`text-[10px] font-extrabold ${item.count > 2 ? 'text-red-600' : 'text-slate-500'}`}
                  >
                    {item.count > 2 ? 'Kontrol Edin' : 'Normal Limit'}
                  </span>
                </div>
                <span
                  className={`size-6 flex items-center justify-center rounded-full text-[11px] font-black ${
                    item.count > 2
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.count}
                </span>
              </div>
            </RowShell>
          ))}
        </ReportCard>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReportCard
            title="En Çok İptal Edilenler"
            accent="bg-slate-400"
            actionLabel="Tümü"
            actionTone="text-slate-500 hover:text-slate-800"
            onAction={() => onOpenReport('cancelled_products')}
          >
            {page.cancelled.length === 0 && <EmptyNote>İptal sipariş kaydı yok.</EmptyNote>}
            {page.cancelled.slice(0, 2).map((item, i) => (
              <RowShell key={item.id}>
                <div className="flex items-center gap-2 min-w-0">
                  <RankBadge index={i} tone="bg-slate-200 text-slate-700 border border-slate-300" />
                  <ProductThumb product={item.product} />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-xs truncate">{item.product.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{item.product.code}</p>
                  </div>
                </div>
                <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                  {item.quantity} İptal
                </span>
              </RowShell>
            ))}
          </ReportCard>

          <ReportCard
            title="En Çok İade Edilenler"
            accent="bg-red-400"
            actionLabel="Tümü"
            actionTone="text-red-600 hover:text-red-800"
            onAction={() => onOpenReport('returned_products')}
          >
            {page.returned.length === 0 && (
              <EmptyNote>İade edilen ürün yok.</EmptyNote>
            )}
            {page.returned.slice(0, 2).map((item, i) => (
              <RowShell key={item.id}>
                <div className="flex items-center gap-2 min-w-0">
                  <RankBadge index={i} tone="bg-red-50 text-red-600 border border-red-100" />
                  <ProductThumb product={item.product} />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-xs truncate">{item.product.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{item.product.code}</p>
                  </div>
                </div>
                <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                  {item.quantity} İade
                </span>
              </RowShell>
            ))}
          </ReportCard>
        </div>
      </div>
    </div>
  );
}
