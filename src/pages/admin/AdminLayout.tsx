import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuthSession, useLogout, ChangePasswordModal } from '@/features/auth';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants';

const TABS = [
  { to: ROUTES.adminManufacturers, label: 'Üretici Yönet' },
  { to: ROUTES.adminRetailers, label: 'Perakendeci Yönet' },
  { to: ROUTES.adminRelationships, label: 'İlişkiler' },
  { to: ROUTES.adminRequests, label: 'Üyelik Talepleri' },
  { to: ROUTES.adminLeads, label: 'Adaylar' },
] as const;

export default function AdminLayout() {
  const { data: user } = useAuthSession();
  const logout = useLogout();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-base font-bold text-slate-900">KÖPRÜ — Platform Yönetimi</h1>
            <p className="text-xs text-slate-500">{user?.fullName ?? 'Platform admini'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPasswordModal(true)}
              className="gap-1.5 text-slate-700 hover:text-slate-900"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Şifre Değiştir</span>
            </Button>
            <Button variant="secondary" size="sm" loading={logout.isPending} onClick={() => logout.mutate()}>
              Çıkış
            </Button>
          </div>
        </div>

        {showPasswordModal && (
          <ChangePasswordModal userName="Platform Admini" onClose={() => setShowPasswordModal(false)} />
        )}

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
