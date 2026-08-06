import { NavLink, Outlet } from 'react-router-dom';
import { useAuthSession, useLogout } from '@/features/auth';
import { Button } from '@/components/ui/Button';
import { SubscriberBadge } from '@/features/admin';
import { ORG_KIND, ROUTES } from '@/constants';

interface Tab {
  to: string;
  label: string;
}

const MANUFACTURER_TABS: Tab[] = [
  { to: `${ROUTES.manufacturer}/musteriler`, label: 'Müşterilerim' },
];

const RETAILER_TABS: Tab[] = [
  { to: `${ROUTES.retailer}/tedarikcilerim`, label: 'Tedarikçilerim' },
];

/** Üretici ve perakendeci panellerinin ortak iskeleti. */
export default function PanelLayout() {
  const { data: user } = useAuthSession();
  const logout = useLogout();

  const isManufacturer = user?.org?.kind === ORG_KIND.manufacturer;
  const tabs = isManufacturer ? MANUFACTURER_TABS : RETAILER_TABS;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-bold text-slate-900">
                {user?.org?.companyName ?? 'KÖPRÜ'}
              </h1>
              {user?.org && (
                <SubscriberBadge
                  isSubscriber={user.org.isSubscriber}
                  plan={user.org.plan}
                />
              )}
            </div>
            <p className="text-xs text-slate-500">
              {isManufacturer ? 'Üretici paneli' : 'Perakendeci paneli'}
            </p>
          </div>
          <Button variant="secondary" loading={logout.isPending} onClick={() => logout.mutate()}>
            Çıkış
          </Button>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
