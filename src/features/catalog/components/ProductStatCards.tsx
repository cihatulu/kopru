import { useState } from 'react';
import { StatCard, STAT_BORDER, STAT_SURFACE } from '@/components/ui/StatCard';
import { compactMoney, type ProductStats } from '../domain/productStats';

const ICONS = {
  box: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  alert: 'M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  wallet: 'M3 7h15a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 0l2-3h11M17 13h.01',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z',
} as const;

/**
 * Ürün Yönetimi sayaç kartları.
 * Mobilde varsayılan olarak yalnız "Toplam Ürün" görünür, sağındaki butonla 4 kart açılır/kapanır.
 * Masaüstünde 4 kart yan yana tam ızgara olarak gösterilir.
 */
export function ProductStatCards({ stats }: { stats: ProductStats }) {
  const [showAllMobile, setShowAllMobile] = useState(false);

  return (
    <div className="w-full">
      {/* 📱 MOBİL GÖRÜNÜM: Açılır / Kapanır 4 Kart Akordeonu (md altı ekranlar) */}
      <div className="space-y-3 md:hidden">
        {/* 1. Kart: Toplam Ürün + Tüm Kartları Göster Butonu */}
        <div className={`${STAT_SURFACE} ${STAT_BORDER}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase leading-tight tracking-wider text-slate-500">
              Toplam Ürün
            </span>

            <div className="flex items-center gap-2">
              {/* Kullanıcının İşaretlediği Kırmızı Bölge: Tüm Kartları Göster Butonu */}
              <button
                type="button"
                onClick={() => setShowAllMobile(!showAllMobile)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
                aria-label={showAllMobile ? 'Kartları Gizle' : 'Tüm Kartları Göster'}
              >
                <span>{showAllMobile ? 'Özetle' : 'Tüm Kartlar'}</span>
                <svg
                  className={`size-3 text-slate-500 transition-transform duration-200 ${
                    showAllMobile ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-black/5 bg-slate-100 text-slate-500 shadow-xs">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5"
                >
                  <path d={ICONS.box} />
                </svg>
              </span>
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-900">{stats.total}</span>
          </div>
        </div>

        {/* Butona basıldığında açılan diğer 3 kart */}
        {showAllMobile && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <StatCard
              label="Kritik Stok"
              value={stats.criticalStock}
              icon={<path d={ICONS.alert} />}
              iconClass="bg-amber-50 text-amber-600"
              valueClass="text-amber-700"
            />
            <StatCard
              label="Toplam Stok Değeri"
              value={compactMoney(stats.stockValue)}
              icon={<path d={ICONS.wallet} />}
            />
            <StatCard
              label="Aktif Satışta"
              value={stats.activeForSale}
              icon={<path d={ICONS.eye} />}
            />
          </div>
        )}
      </div>

      {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: 4 Kolonlu Tam Izgara (md ve üzeri ekranlar) */}
      <div className="hidden md:grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Toplam Ürün" value={stats.total} icon={<path d={ICONS.box} />} />
        <StatCard
          label="Kritik Stok"
          value={stats.criticalStock}
          icon={<path d={ICONS.alert} />}
          iconClass="bg-amber-50 text-amber-600"
          valueClass="text-amber-700"
        />
        <StatCard
          label="Toplam Stok Değeri"
          value={compactMoney(stats.stockValue)}
          icon={<path d={ICONS.wallet} />}
        />
        <StatCard label="Aktif Satışta" value={stats.activeForSale} icon={<path d={ICONS.eye} />} />
      </div>
    </div>
  );
}
