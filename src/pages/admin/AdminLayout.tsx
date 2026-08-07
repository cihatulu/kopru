import { NavLink, Outlet } from 'react-router-dom';
import { useAuthSession, useLogout } from '@/features/auth';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants';

const TABS = [
  { to: ROUTES.adminManufacturers, label: 'Üretici Yönet' },
  { to: ROUTES.adminRetailers, label: 'Perakendeci Yönet' },
  { to: ROUTES.adminRelationships, label: 'İlişkiler' },
  { to: ROUTES.adminRequests, label: 'Abonelik Talepleri' },
  { to: ROUTES.adminLeads, label: 'Adaylar' },
] as const;

export default function AdminLayout() {
  const { data: user } = useAuthSession();
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-base font-bold text-slate-900">KÖPRÜ — Platform Yönetimi</h1>
            <p className="text-xs text-slate-500">{user?.fullName ?? 'Platform admini'}</p>
          </div>
          <Button variant="secondary" loading={logout.isPending} onClick={() => logout.mutate()}>
            Çıkış
          </Button>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6">
          {TABS.map((tab) => (
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
