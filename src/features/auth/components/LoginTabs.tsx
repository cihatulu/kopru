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
      className="grid grid-cols-5 border-b border-slate-200/80 bg-slate-50/80 p-1.5 gap-1"
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
            className={`flex flex-col items-center justify-center gap-1.5 px-1 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
              isActive
                ? 'bg-white text-[#c25730] font-extrabold shadow-sm border border-slate-200/70 ring-1 ring-[#d96b43]/15'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/60 border border-transparent'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`size-4.5 shrink-0 transition-transform ${isActive ? 'scale-110 text-[#d96b43]' : 'text-slate-400'}`}
              aria-hidden="true"
            >
              <path d={ICONS[tab.id]} />
            </svg>
            <div className="flex flex-col items-center text-center text-[10.5px] sm:text-xs font-semibold leading-tight tracking-tight">
              <span>{parts[0]}</span>
              {parts.length > 1 ? (
                <span>{parts.slice(1).join(' ')}</span>
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
