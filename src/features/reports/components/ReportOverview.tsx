import { formatMoney } from '@/lib/format';
import { MonthlyBarChart } from './MonthlyBarChart';
import { ReportKpiCards } from './ReportKpiCards';
import { EmptyNote, ProductThumb, RankBadge, ReportCard, RowShell } from './ReportCard';
import type { useReportsPage } from '../api/useReportsPage';
import type { ReportKind } from '../domain/reportColumns';

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

interface Props {
  page: ReturnType<typeof useReportsPage>;
  onOpenReport: (kind: ReportKind) => void;
}

export function ReportOverview({ page, onOpenReport }: Props) {
  return (
    <div className="space-y-6">
      <ReportKpiCards kpi={page.kpi} />

      {page.months.some((m) => m.revenue > 0) && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-blue-500" />
              <h2 className="text-sm font-bold text-slate-800">Aylık Ciro Grafiği</h2>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">Son 6 ay</span>
          </div>
          <MonthlyBarChart months={page.months} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportCard
          title="En Çok Satın Alan Müşteriler"
          accent="bg-blue-500"
          actionLabel="Tümünü Gör"
          onAction={() => onOpenReport('customers')}
        >
          {page.customers.length === 0 && <EmptyNote>Yeterli veri bulunamadı.</EmptyNote>}
          {page.customers.slice(0, 3).map((item, i) => (
            <RowShell key={item.id}>
              <div className="flex items-center gap-3">
                <RankBadge index={i} tone="bg-blue-50 text-blue-600 border border-blue-100" />
                <p className="font-bold text-slate-800 text-sm">{item.companyName}</p>
              </div>
              <p className="font-extrabold text-slate-900 text-sm">{formatMoney(item.totalAmount)}</p>
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
              <div className="flex items-center gap-3">
                <RankBadge index={i} tone="bg-amber-50 text-amber-700 border border-amber-100" />
                <ProductThumb product={item.product} />
                <div>
                  <p className="font-bold text-slate-800 text-sm">{item.product.name}</p>
                  <p className="text-xs text-slate-450 mt-0.5">{item.product.code}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-slate-900 text-sm">{item.quantity} Adet</p>
                <p className="text-[10px] text-emerald-600 font-black mt-0.5">
                  Kâr: {formatMoney(item.profit)}
                </p>
              </div>
            </RowShell>
          ))}
        </ReportCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportCard
          title="SSH & Arıza Yoğunluk Analizi"
          accent="bg-rose-500"
          actionLabel="Tümünü Gör"
          onAction={() => onOpenReport('ssh')}
        >
          <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-xl mb-4 flex items-start gap-2.5">
            <InfoIcon />
            <p className="text-xs text-amber-800 font-semibold leading-relaxed">
              Bu liste, açılan SSH taleplerinde{' '}
              <strong className="font-extrabold text-amber-900">seçilen</strong> ürünlerin arıza
              sıklığını gösterir.
            </p>
          </div>

          {page.ssh.length === 0 && <EmptyNote>Henüz SSH verisi oluşmadı.</EmptyNote>}
          {page.ssh.slice(0, 3).map((item) => (
            <RowShell key={item.id}>
              <div className="flex items-center gap-3">
                <ProductThumb product={item.product} />
                <div>
                  <p className="font-bold text-slate-800 text-sm">{item.product.name}</p>
                  <p className="text-xs text-slate-450 mt-0.5">
                    {item.product.category || 'Kategorisiz'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Tavsiye</span>
                  <span
                    className={`text-[10px] font-extrabold ${item.count > 2 ? 'text-rose-600' : 'text-slate-450'}`}
                  >
                    {item.count > 2 ? 'Kontrol Edin' : 'Normal Limit'}
                  </span>
                </div>
                <span
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-black ${
                    item.count > 2
                      ? 'bg-rose-50 border border-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-550'
                  }`}
                >
                  {item.count}
                </span>
              </div>
            </RowShell>
          ))}
        </ReportCard>

        <div className="flex flex-col gap-6">
          <ReportCard
            title="En Çok İptal Edilen Ürünler"
            accent="bg-slate-400"
            actionLabel="Tümünü Gör"
            actionTone="text-slate-500 hover:text-slate-800"
            onAction={() => onOpenReport('cancelled_products')}
          >
            {page.cancelled.length === 0 && <EmptyNote>İptal sipariş kaydı oluşmadı.</EmptyNote>}
            {page.cancelled.slice(0, 2).map((item, i) => (
              <RowShell key={item.id}>
                <div className="flex items-center gap-3">
                  <RankBadge index={i} tone="bg-slate-200 text-slate-700 border border-slate-300" />
                  <ProductThumb product={item.product} />
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{item.product.name}</p>
                    <p className="text-xs text-slate-450 mt-0.5">{item.product.code}</p>
                  </div>
                </div>
                <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap">
                  {item.quantity} Adet İptal
                </span>
              </RowShell>
            ))}
          </ReportCard>

          <ReportCard
            title="En Çok İade Edilen Ürünler"
            accent="bg-rose-400"
            actionLabel="Tümünü Gör"
            actionTone="text-rose-600 hover:text-rose-800"
            onAction={() => onOpenReport('returned_products')}
          >
            {page.returned.length === 0 && (
              <EmptyNote>İade edilen ürün kaydı bulunmuyor.</EmptyNote>
            )}
            {page.returned.slice(0, 2).map((item, i) => (
              <RowShell key={item.id}>
                <div className="flex items-center gap-3">
                  <RankBadge index={i} tone="bg-rose-50 text-rose-600 border border-rose-100" />
                  <ProductThumb product={item.product} />
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{item.product.name}</p>
                    <p className="text-xs text-slate-450 mt-0.5">{item.product.code}</p>
                  </div>
                </div>
                <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap">
                  {item.quantity} Adet İade
                </span>
              </RowShell>
            ))}
          </ReportCard>
        </div>
      </div>
    </div>
  );
}
