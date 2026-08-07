import { Button } from '@/components/ui/Button';

interface Props {
  panelLabel: string;
  userName: string;
  /** Misafir org'lar için rozet; abone ise plan adı. */
  badge: string;
  loggingOut: boolean;
  onMenu: () => void;
  onLogout: () => void;
}

/** Üst çubuk: panel rozeti, kullanıcı ve çıkış. */
export function TopBar({ panelLabel, userName, badge, loggingOut, onMenu, onLogout }: Props) {
  const initial = userName.trim().charAt(0).toUpperCase() || '?';

  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Menü"
          onClick={onMenu}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>

        <span className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
          {panelLabel}
        </span>
        <span className="hidden rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 sm:inline">
          {badge}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden truncate text-sm font-semibold uppercase text-slate-700 sm:inline">
          {userName}
        </span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
          {initial}
        </span>
        <Button loading={loggingOut} onClick={onLogout} className="bg-slate-900 hover:bg-slate-800">
          Çıkış Yap
        </Button>
      </div>
    </header>
  );
}
