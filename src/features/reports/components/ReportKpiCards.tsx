import { formatMoney } from '@/lib/format';
import type { Kpi } from '../domain/profitability';

// Sınıf adları TAM yazılır; Tailwind kaynağı statik tarar.
const CARDS = [
  {
    key: 'totalOrders' as const,
    label: 'Toplam Sipariş',
    money: false,
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  {
    key: 'totalRevenue' as const,
    label: 'Toplam Ciro',
    money: true,
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'text-slate-700',
    bg: 'bg-slate-50',
    border: 'border-slate-100',
  },
  {
    key: 'netProfit' as const,
    label: 'Net Kâr',
    money: true,
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    key: 'activeRetailers' as const,
    label: 'Aktif Bayi',
    money: false,
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
  },
];

export function ReportKpiCards({ kpi }: { kpi: Kpi }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className={`p-4 rounded-2xl border ${card.border} ${card.bg} flex items-center gap-3.5 shadow-sm`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border ${card.border} shadow-sm`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 ${card.color}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {card.label}
            </p>
            <p className={`text-lg font-black mt-0.5 ${card.color}`}>
              {card.money ? formatMoney(kpi[card.key]) : String(kpi[card.key])}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
