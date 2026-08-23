import { STAT_BORDER, STAT_SURFACE, StatCardContent } from '@/components/ui/StatCard';
import type { OrderStats } from '../api/useOrderStats';
import type { OrderStatus } from '../domain/status';

export type OrderFilter = OrderStatus | 'all';

interface CardDef {
  key: OrderFilter;
  field: keyof OrderStats;
  label: string;
  /** Rakamın rengi — durum burada okunur. */
  value: string;
  /** İkon kutusu: açık zemin + koyu ikon. */
  icon: string;
  /** Seçiliyken kenarlık. */
  active: string;
  path: string;
}

const CARDS: CardDef[] = [
  {
    key: 'all',
    field: 'all',
    label: 'Tüm Siparişler',
    value: 'text-slate-900',
    icon: 'bg-slate-100 text-slate-500',
    active: 'border-slate-800 ring-2 ring-slate-800/10 shadow-xs',
    path: 'M4 6h6v6H4zM14 6h6v6h-6zM4 16h6v4H4zM14 16h6v4h-6z',
  },
  {
    key: 'pending',
    field: 'pending',
    label: 'Bekleyen',
    value: 'text-amber-700',
    icon: 'bg-amber-50 text-amber-600',
    active: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/10 shadow-xs',
    path: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key: 'in_production',
    field: 'in_production',
    label: 'Üretiliyor',
    value: 'text-brand-700',
    icon: 'bg-brand-50 text-brand-600',
    active: 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/10 shadow-xs',
    path: 'M3 10h18M5 10V7a2 2 0 012-2h10a2 2 0 012 2v3m-16 0v7a2 2 0 002 2h12a2 2 0 002-2v-7',
  },
  {
    key: 'shipped',
    field: 'shipped',
    label: 'Sevkiyatta',
    value: 'text-sky-700',
    icon: 'bg-sky-50 text-sky-600',
    active: 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/10 shadow-xs',
    path: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1',
  },
  {
    key: 'delivered',
    field: 'delivered',
    label: 'Teslim Edildi',
    value: 'text-emerald-700',
    icon: 'bg-emerald-50 text-emerald-600',
    active: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10 shadow-xs',
    path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key: 'cancelled',
    field: 'cancelled',
    label: 'İptal Edildi',
    value: 'text-red-700',
    icon: 'bg-red-50 text-red-600',
    active: 'border-red-500 ring-2 ring-red-500/20 bg-red-50/10 shadow-xs',
    path: 'M10 14l4-4m0 4l-4-4m11 2a9 9 0 11-18 0 9 9 0 0118 0z',
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
    <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {CARDS.map((c) => (
        <button
          key={c.key}
          type="button"
          aria-pressed={active === c.key}
          onClick={() => onSelect(c.key)}
          className={`${STAT_SURFACE} cursor-pointer transition-all ${
            active === c.key ? c.active : `${STAT_BORDER} hover:border-slate-300`
          }`}
        >
          <StatCardContent
            label={c.label}
            value={stats[c.field]}
            iconClass={c.icon}
            valueClass={c.value}
            icon={<path d={c.path} />}
          />
        </button>
      ))}
    </div>
  );
}
