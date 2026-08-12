import type { FinanceTab } from '../api/useFinancePage';

interface TabDef {
  key: FinanceTab;
  label: string;
}

const TABS: TabDef[] = [
  { key: 'cash', label: 'Kasa Hesabı (Nakit)' },
  { key: 'pos_own', label: 'Bizim POS (Banka)' },
  { key: 'pos_manufacturer', label: 'Üretici POS' },
  { key: 'customers', label: 'Müşteri Carileri' },
];

interface Props {
  active: FinanceTab;
  /** Yalnız müşteri carileri sekmesinde rozet gösterilir. */
  customerCount: number;
  onSelect: (tab: FinanceTab) => void;
}

export function FinanceTabs({ active, customerCount, onSelect }: Props) {
  return (
    <div className="flex gap-1 border-b border-slate-200">
      {TABS.map(({ key, label }) => {
        const count = key === 'customers' ? customerCount : 0;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              active === key
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
            {count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  active === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
