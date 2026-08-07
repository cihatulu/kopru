import { NavLink } from 'react-router-dom';
import type { NavItem } from './navigation';

interface Props {
  items: NavItem[];
  companyName: string;
  open: boolean;
  onClose: () => void;
}

/** Koyu sol menü. Mobilde kayarak açılır, masaüstünde sabittir. */
export function Sidebar({ items, companyName, open, onClose }: Props) {
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Menüyü kapat"
          onClick={onClose}
          className="fixed inset-0 z-20 bg-slate-900/50 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex h-full w-64 flex-col bg-slate-900 transition-transform duration-300 md:relative md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-4 py-5">
          <div className="rounded-xl bg-white px-4 py-4 text-center">
            <span className="block truncate text-base font-extrabold tracking-tight text-slate-900">
              {companyName}
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to.split('/').length === 2}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-700/80 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5 shrink-0"
                aria-hidden="true"
              >
                <path d={item.icon} />
              </svg>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
