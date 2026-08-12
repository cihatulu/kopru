export type SupplierTab = 'active' | 'passive';

interface Props {
  value: SupplierTab;
  activeCount: number;
  passiveCount: number;
  onChange: (tab: SupplierTab) => void;
}

const TABS: { key: SupplierTab; label: string; dot: string }[] = [
  { key: 'active', label: 'Aktif Üreticiler', dot: 'bg-emerald-500' },
  { key: 'passive', label: 'Pasif Üreticiler', dot: 'bg-rose-500' },
];

/** Aktif / pasif üretici sekmeleri. */
export function SupplierTabs({ value, activeCount, passiveCount, onChange }: Props) {
  const counts: Record<SupplierTab, number> = { active: activeCount, passive: passiveCount };

  return (
    <div className="flex gap-1 border-b border-slate-200">
      {TABS.map((tab) => {
        const selected = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            aria-current={selected ? 'page' : undefined}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              selected
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${selected ? tab.dot : 'bg-slate-300'}`}
            />
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className="rounded-full bg-slate-100 text-slate-600 px-1.5 py-0.5 text-xs font-bold">
                {counts[tab.key]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
