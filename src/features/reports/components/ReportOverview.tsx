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
      {/* 4 Ana Sayaç Kartı */}
      <ReportKpiCards kpi={page.kpi} />

      {/* 2'li Üst Blok: Müşteriler & Çok Satan Ürünler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. En Çok Satın Alan Müşteriler */}
        <ReportCard
          title="En Çok Satın Alan Müşteriler"
          accent="bg-blue-500"
          actionLabel="Tümünü Gör"
          onAction={() => onOpenReport('customers')}
        >
          {page.customers.length === 0 && <EmptyNote>Yeterli veri bulunamadı.</EmptyNote>}
          {page.customers.slice(0, 3).map((item, i) => (
            <RowShell key={item.id}>
              {/* Üst Satır: Sıra & Müşteri Adı */}
              <div className="flex items-center gap-2 min-w-0">
                <RankBadge index={i} tone="bg-blue-50 text-blue-600 border border-blue-100" />
                <p className="font-bold text-slate-800 text-xs truncate" title={item.companyName}>
                  {item.companyName}
                </p>
              </div>

              {/* Alt Satır: Tutar Bilgisi */}
              <div className="flex items-center justify-between border-t border-slate-200/50 pt-1.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Toplam Alım
                </span>
                <span className="font-black text-slate-900 font-mono">
                  {formatMoney(item.totalAmount)}
                </span>
              </div>
            </RowShell>
          ))}
        </ReportCard>

        {/* 2. En Çok Satan Ürünler */}
        <ReportCard
          title="En Çok Satan Ürünler"
          accent="bg-amber-500"
          actionLabel="Tümünü Gör"
          onAction={() => onOpenReport('products')}
        >
          {page.products.length === 0 && <EmptyNote>Yeterli veri bulunamadı.</EmptyNote>}
          {page.products.slice(0, 3).map((item, i) => (
            <RowShell key={item.id}>
              {/* Üst Satır: Sıra, Görsel & Ürün Adı */}
              <div className="flex items-center gap-2.5 min-w-0">
                <RankBadge index={i} tone="bg-amber-50 text-amber-700 border border-amber-100" />
                <ProductThumb product={item.product} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 text-xs truncate" title={item.product.name}>
                    {item.product.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">
                    {item.product.code}
                  </p>
                </div>
              </div>

              {/* Alt Satır: Satış Adedi & Kâr */}
              <div className="flex items-center justify-between border-t border-slate-200/50 pt-1.5 text-xs">
                <span className="font-extrabold text-slate-800 font-mono">
                  {item.quantity} Adet Satış
                </span>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200/60 px-2 py-0.2 rounded-full">
                  Kâr: {formatMoney(item.profit)}
                </span>
              </div>
            </RowShell>
          ))}
        </ReportCard>
      </div>

      {/* 3'lü Alt Blok: SSH, İptal, İade */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 3. SSH & Arıza Yoğunluk Analizi */}
        <ReportCard
          title="SSH & Arıza Yoğunluk Analizi"
          accent="bg-red-500"
          actionLabel="Tümünü Gör"
          onAction={() => onOpenReport('ssh')}
        >
          <div className="bg-amber-50/60 border border-amber-200/60 p-2 rounded-xl mb-1 flex items-center gap-2">
            <InfoIcon />
            <p className="text-[11px] text-amber-900 font-semibold leading-tight">
              SSH taleplerinde <strong className="font-extrabold">seçilen</strong> ürünlerin arıza sıklığı.
            </p>
          </div>

          {page.ssh.length === 0 && <EmptyNote>Henüz SSH verisi oluşmadı.</EmptyNote>}
          {page.ssh.slice(0, 3).map((item, i) => (
            <RowShell key={item.id}>
              {/* Üst Satır: Sıra, Görsel & Ürün Adı */}
              <div className="flex items-center gap-2 min-w-0">
                <RankBadge index={i} tone="bg-red-50 text-red-700 border border-red-100" />
                <ProductThumb product={item.product} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 text-xs truncate" title={item.product.name}>
                    {item.product.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {item.product.category || 'Kategorisiz'}
                  </p>
                </div>
              </div>

              {/* Alt Satır: Tavsiye Durumu & Talep Sayısı */}
              <div className="flex items-center justify-between border-t border-slate-200/50 pt-1.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold">Tavsiye:</span>
                  <span
                    className={`text-[10px] font-extrabold ${item.count > 2 ? 'text-red-600' : 'text-slate-600'}`}
                  >
                    {item.count > 2 ? 'Kontrol Edin' : 'Normal Limit'}
                  </span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                    item.count > 2
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {item.count} Talep
                </span>
              </div>
            </RowShell>
          ))}
        </ReportCard>

        {/* 4. En Çok İptal Edilenler */}
        <ReportCard
          title="En Çok İptal Edilenler"
          accent="bg-slate-400"
          actionLabel="Tümünü Gör"
          actionTone="text-slate-600 hover:text-slate-900"
          onAction={() => onOpenReport('cancelled_products')}
        >
          {page.cancelled.length === 0 && <EmptyNote>İptal sipariş kaydı yok.</EmptyNote>}
          {page.cancelled.slice(0, 3).map((item, i) => (
            <RowShell key={item.id}>
              {/* Üst Satır: Sıra, Görsel & Ürün Adı */}
              <div className="flex items-center gap-2 min-w-0">
                <RankBadge index={i} tone="bg-slate-200 text-slate-700 border border-slate-300" />
                <ProductThumb product={item.product} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 text-xs truncate" title={item.product.name}>
                    {item.product.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{item.product.code}</p>
                </div>
              </div>

              {/* Alt Satır: İptal Adedi */}
              <div className="flex items-center justify-between border-t border-slate-200/50 pt-1.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  İptal Miktarı
                </span>
                <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                  {item.quantity} İptal
                </span>
              </div>
            </RowShell>
          ))}
        </ReportCard>

        {/* 5. En Çok İade Edilenler */}
        <ReportCard
          title="En Çok İade Edilenler"
          accent="bg-red-400"
          actionLabel="Tümünü Gör"
          actionTone="text-red-600 hover:text-red-800"
          onAction={() => onOpenReport('returned_products')}
        >
          {page.returned.length === 0 && (
            <EmptyNote>İade edilen ürün yok.</EmptyNote>
          )}
          {page.returned.slice(0, 3).map((item, i) => (
            <RowShell key={item.id}>
              {/* Üst Satır: Sıra, Görsel & Ürün Adı */}
              <div className="flex items-center gap-2 min-w-0">
                <RankBadge index={i} tone="bg-red-50 text-red-600 border border-red-100" />
                <ProductThumb product={item.product} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 text-xs truncate" title={item.product.name}>
                    {item.product.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{item.product.code}</p>
                </div>
              </div>

              {/* Alt Satır: İade Adedi */}
              <div className="flex items-center justify-between border-t border-slate-200/50 pt-1.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  İade Miktarı
                </span>
                <span className="bg-red-50 text-red-700 border border-red-200 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                  {item.quantity} İade
                </span>
              </div>
            </RowShell>
          ))}
        </ReportCard>
      </div>
    </div>
  );
}
