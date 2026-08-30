import { LOGIN_TABS, type TabId } from '../domain/portals';

interface Props {
  active: TabId;
  onSelect: (id: TabId) => void;
}

const ICONS: Record<TabId, string> = {
  'member-manufacturer': 'M3 21V8l5-4 5 4v13M13 21V11l4-3 4 3v10M3 21h18',
  'member-retailer': 'M3 9h18l-1.5 11.5a1 1 0 01-1 .5h-13a1 1 0 01-1-.5L3 9zM8 9V6a4 4 0 018 0v3',
  'guest-manufacturer': 'M12 3l9 6-9 6-9-6 9-6zM3 15l9 6 9-6',
  'guest-retailer': 'M4 7h16v13H4zM4 7l2-4h12l2 4M9 12h6',
  admin: 'M12 11a4 4 0 100-8 4 4 0 000 8zM4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1',
};

/** Beş giriş yolu. Sekme değişimi yalnızca formu değiştirir; mantık aynıdır. */
export function LoginTabs({ active, onSelect }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Giriş tipi"
      className="grid grid-cols-5 border-b border-slate-200/90 bg-slate-100/75 p-1 sm:p-2 gap-0.5 sm:gap-1.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
    >
      {LOGIN_TABS.map((tab) => {
        const isActive = tab.id === active;
        const parts = tab.label.split(' ');

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onSelect(tab.id)}
            className={`flex flex-col items-center justify-center gap-1 sm:gap-1.5 px-0.5 sm:px-1.5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden ${
              isActive
                ? 'bg-white text-[#0f172b] font-extrabold shadow-[0_4px_12px_-2px_rgba(15,23,43,0.15),0_2px_4px_-1px_rgba(15,23,43,0.08)] border border-slate-200/90 ring-1 ring-slate-900/5 -translate-y-0.5'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/60 border border-transparent active:scale-95'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`size-4 sm:size-4.5 shrink-0 transition-transform ${isActive ? 'scale-105 sm:scale-110 text-[#0f172b]' : 'text-slate-400'}`}
              aria-hidden="true"
            >
              <path d={ICONS[tab.id]} />
            </svg>
            <div className="w-full flex flex-col items-center justify-center text-center text-[9px] min-[360px]:text-[9.5px] min-[400px]:text-[10.5px] sm:text-xs font-bold leading-tight tracking-tighter sm:tracking-tight truncate">
              <span className="w-full truncate">{parts[0]}</span>
              {parts.length > 1 ? (
                <span className="w-full truncate">{parts.slice(1).join(' ')}</span>
              ) : (
                <span className="invisible select-none" aria-hidden="true">
                  &nbsp;
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
