import type { ReactNode } from 'react';
import type { OrderStats } from '../api/useOrderStats';
import type { OrderStatus } from '../domain/status';

export type OrderFilter = OrderStatus | 'all';

const Icon = ({ d, className }: { d: string; className: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
);

interface CardDef {
  key: OrderFilter;
  field: keyof OrderStats;
  label: string;
  /** Seçiliyken kenarlık + halka. */
  active: string;
  labelTone: string;
  valueTone: string;
  iconBg: string;
  icon: ReactNode;
}

const CARDS: CardDef[] = [
  {
    key: 'all',
    field: 'all',
    label: 'Tüm Siparişler',
    active: 'border-slate-300 ring-2 ring-slate-900/5 shadow-md',
    labelTone: 'text-slate-400',
    valueTone: 'text-slate-900',
    iconBg: 'bg-slate-100 text-slate-500',
    icon: <Icon className="w-4 h-4" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />,
  },
  {
    key: 'pending',
    field: 'pending',
    label: 'Bekleyen',
    active: 'border-amber-300 ring-2 ring-amber-500/10 shadow-md',
    labelTone: 'text-amber-600',
    valueTone: 'text-amber-700',
    iconBg: 'bg-amber-50 text-amber-505',
    icon: <Icon className="w-4 h-4 text-amber-500" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  {
    key: 'in_production',
    field: 'in_production',
    label: 'Üretiliyor',
    active: 'border-indigo-300 ring-2 ring-indigo-500/10 shadow-md',
    labelTone: 'text-indigo-600',
    valueTone: 'text-indigo-700',
    iconBg: 'bg-indigo-50 text-indigo-50',
    icon: <Icon className="w-4 h-4 text-indigo-500" d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a3 3 0 012.122.879L13.5 5.379a3 3 0 002.122.879H19.5a3 3 0 013 3v.888a3 3 0 01-3 3h-15a3 3 0 01-3-3z" />,
  },
  {
    key: 'shipped',
    field: 'shipped',
    label: 'Sevkiyatta',
    active: 'border-cyan-300 ring-2 ring-cyan-500/10 shadow-md',
    labelTone: 'text-cyan-600',
    valueTone: 'text-cyan-700',
    iconBg: 'bg-cyan-50 text-cyan-505',
    icon: <Icon className="w-4 h-4 text-cyan-500" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1" />,
  },
  {
    key: 'delivered',
    field: 'delivered',
    label: 'Teslim Edildi',
    active: 'border-emerald-300 ring-2 ring-emerald-500/10 shadow-md',
    labelTone: 'text-emerald-600',
    valueTone: 'text-emerald-700',
    iconBg: 'bg-emerald-50 text-emerald-505',
    icon: <Icon className="w-4 h-4 text-emerald-500" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  {
    key: 'cancelled',
    field: 'cancelled',
    label: 'İptal Edildi',
    active: 'border-red-300 ring-2 ring-red-500/10 shadow-md',
    labelTone: 'text-red-600',
    valueTone: 'text-red-700',
    iconBg: 'bg-red-50 text-red-505',
    icon: <Icon className="w-4 h-4 text-red-500" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
];

interface Props {
  stats: OrderStats;
  active: OrderFilter;
  onSelect: (filter: OrderFilter) => void;
}

/** Sipariş sayacı kartları — aynı zamanda durum süzgeci. */
export function OrderStatCards({ stats, active, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {CARDS.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onSelect(c.key)}
          className={`flex flex-col items-start justify-between rounded-2xl border bg-white p-5 text-left transition-all ${
            active === c.key ? c.active : 'border-slate-100 hover:border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <span className={`text-[10px] font-black uppercase tracking-wider ${c.labelTone}`}>
              {c.label}
            </span>
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${c.iconBg}`}>
              {c.icon}
            </span>
          </div>
          <span className={`mt-3 text-3xl font-black ${c.valueTone}`}>{stats[c.field]}</span>
        </button>
      ))}
    </div>
  );
}
