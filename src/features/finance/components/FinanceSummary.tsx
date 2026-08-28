import { formatMoney } from '@/lib/format';
import type { FinanceStats } from '../domain/financeStats';
import type { FinanceTab } from '../api/useFinancePage';

// Sınıf adları TAM yazılır: Tailwind kaynağı statik tarar, `bg-${tone}-50`
// gibi bir kurgu üretim derlemesinde hiç oluşmaz.
const TONE = {
  blue: {
    box: 'bg-white border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04] hover:shadow-md hover:shadow-slate-200/80 transition-all',
    label: 'text-blue-600',
  },
  emerald: {
    box: 'bg-white border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04] hover:shadow-md hover:shadow-slate-200/80 transition-all',
    label: 'text-emerald-600',
  },
  red: {
    box: 'bg-white border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04] hover:shadow-md hover:shadow-slate-200/80 transition-all',
    label: 'text-red-600',
  },
  neutral: {
    box: 'bg-white border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04] hover:shadow-md hover:shadow-slate-200/80 transition-all',
    label: 'text-slate-500',
  },
  orange: {
    box: 'bg-white border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04] hover:shadow-md hover:shadow-slate-200/80 transition-all',
    label: 'text-orange-600',
  },
} as const;

interface CardProps {
  tone: keyof typeof TONE;
  label: string;
  value: number;
  hint?: string;
  big?: boolean;
}

const Card = ({ tone, label, value, hint, big }: CardProps) => (
  <div className={`p-4 sm:p-5 rounded-2xl border ${TONE[tone].box}`}>
    <p className={`text-[11px] font-extrabold uppercase tracking-wider mb-1.5 ${TONE[tone].label}`}>{label}</p>
    <p className={`${big ? 'text-2xl sm:text-3xl font-black' : 'text-xl sm:text-2xl font-black'} text-slate-900 font-mono tracking-tight`}>
      {formatMoney(value)}
    </p>
    {hint && <p className="text-[11px] font-medium text-slate-400 mt-1.5">{hint}</p>}
  </div>
);

/**
 * Sekmenin özet kartları.
 *
 * Kasa bakiyesi YALNIZ nakitten oluşur; POS tahsilatı bankaya gider, üretici
 * POS'u ise perakendecinin parası hiç değildir — bu yüzden ayrı kartlar.
 */
export function FinanceSummary({ tab, stats }: { tab: FinanceTab; stats: FinanceStats }) {
  if (tab === 'cash') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card tone="blue" label="Güncel Nakit Kasa" value={stats.cash_balance} big />
        <Card tone="emerald" label="Nakit Girişi" value={stats.total_cash_income} />
        <Card tone="red" label="Nakit Çıkışı" value={stats.total_cash_expense} />
      </div>
    );
  }

  if (tab === 'pos_own') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          tone="neutral"
          label="Bizim POS Toplam"
          value={stats.total_pos_own}
          hint="Sizin banka hesabınıza geçen tutarlar"
          big
        />
      </div>
    );
  }

  if (tab === 'pos_manufacturer') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          tone="orange"
          label="Üretici POS Toplam"
          value={stats.total_pos_manufacturer}
          hint="Üretici carilerinden düşülen tutarlar"
          big
        />
      </div>
    );
  }

  return null;
}
