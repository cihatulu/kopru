import { formatMoney } from '@/lib/format';
import type { FinanceStats } from '../domain/financeStats';
import type { FinanceTab } from '../api/useFinancePage';

// Sınıf adları TAM yazılır: Tailwind kaynağı statik tarar, `bg-${tone}-50`
// gibi bir kurgu üretim derlemesinde hiç oluşmaz.
const TONE = {
  blue: { box: 'bg-blue-50/50 border-blue-100/50', label: 'text-blue-600' },
  emerald: { box: 'bg-emerald-50/50 border-emerald-100/50', label: 'text-emerald-600' },
  red: { box: 'bg-red-50/50 border-red-100/50', label: 'text-red-600' },
  neutral: { box: 'bg-slate-50 border-slate-200', label: 'text-slate-500' },
  orange: { box: 'bg-orange-50/50 border-orange-100/50', label: 'text-orange-600' },
} as const;

interface CardProps {
  tone: keyof typeof TONE;
  label: string;
  value: number;
  hint?: string;
  big?: boolean;
}

const Card = ({ tone, label, value, hint, big }: CardProps) => (
  <div className={`p-4 rounded-xl border ${TONE[tone].box}`}>
    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${TONE[tone].label}`}>{label}</p>
    <p className={`${big ? 'text-2xl font-black' : 'text-xl font-bold'} text-slate-900`}>
      {formatMoney(value)}
    </p>
    {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
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
