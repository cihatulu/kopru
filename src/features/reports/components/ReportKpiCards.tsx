import { useState } from 'react';
import { StatCard, STAT_BORDER, STAT_SURFACE } from '@/components/ui/StatCard';
import { formatMoney } from '@/lib/format';
import type { Kpi } from '../domain/profitability';

const ORDER_ICON = 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2';
const REVENUE_ICON = 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
const RETAILER_ICON = 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0';
const PROFIT_ICON = 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6';

export function ReportKpiCards({ kpi }: { kpi: Kpi }) {
  const [showAllMobile, setShowAllMobile] = useState(false);
  const loss = kpi.netProfit < 0;

  return (
    <div className="w-full">
      {/* 📱 MOBİL GÖRÜNÜM: Açılır / Kapanır 4 Kart Akordeonu (md altı ekranlar) */}
      <div className="space-y-3 md:hidden">
        {/* 1. Kart: Toplam Sipariş + Tüm Kartları Göster Butonu */}
        <div className={`${STAT_SURFACE} ${STAT_BORDER}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase leading-tight tracking-wider text-slate-500">
              Toplam Sipariş
            </span>

            <div className="flex items-center gap-2">
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
                  <path d={ORDER_ICON} />
                </svg>
              </span>
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-900">
              {kpi.totalOrders}
            </span>
          </div>
        </div>

        {/* Butona basıldığında açılan diğer 3 kart */}
        {showAllMobile && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <StatCard
              label="Toplam Ciro"
              value={formatMoney(kpi.totalRevenue)}
              icon={<path d={REVENUE_ICON} />}
            />
            <StatCard
              label="Aktif Bayi"
              value={String(kpi.activeRetailers)}
              icon={<path d={RETAILER_ICON} />}
            />
            <StatCard
              label="Net Kâr"
              value={formatMoney(kpi.netProfit)}
              icon={<path d={PROFIT_ICON} />}
              iconClass={loss ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}
              valueClass={loss ? 'text-red-700' : 'text-emerald-700'}
            />
          </div>
        )}
      </div>

      {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: 4 Kolonlu Tam Izgara (md ve üzeri ekranlar) */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Toplam Sipariş"
          value={String(kpi.totalOrders)}
          icon={<path d={ORDER_ICON} />}
        />
        <StatCard
          label="Toplam Ciro"
          value={formatMoney(kpi.totalRevenue)}
          icon={<path d={REVENUE_ICON} />}
        />
        <StatCard
          label="Aktif Bayi"
          value={String(kpi.activeRetailers)}
          icon={<path d={RETAILER_ICON} />}
        />
        <StatCard
          label="Net Kâr"
          value={formatMoney(kpi.netProfit)}
          icon={<path d={PROFIT_ICON} />}
          iconClass={loss ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}
          valueClass={loss ? 'text-red-700' : 'text-emerald-700'}
        />
      </div>
    </div>
  );
}
