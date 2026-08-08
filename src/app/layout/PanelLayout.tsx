import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthSession, useLogout } from '@/features/auth';
import { CatalogTree } from '@/features/catalog';
import { ORG_KIND } from '@/constants';
import { navFor } from './navigation';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

/** Üretici ve perakendeci panellerinin ortak iskeleti — sol menü + üst çubuk. */
export default function PanelLayout() {
  const { data: user } = useAuthSession();
  const logout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);

  const org = user?.org;
  if (!org) return null;

  const isManufacturer = org.kind === ORG_KIND.manufacturer;
  const items = navFor(org.kind, org.enabledModules);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        items={items}
        companyName={org.companyName}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        slots={
          // Ağaç veriyi KENDİ çeker; layout yalnız yerleştirir (A20).
          isManufacturer ? { 'catalog-tree': <CatalogTree ownerOrgId={org.id} /> } : {}
        }
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          panelLabel={isManufacturer ? 'Üretici Paneli' : 'Perakendeci Paneli'}
          userName={user.fullName ?? org.companyName}
          badge={org.isSubscriber ? `Abone · ${org.plan ?? ''}` : 'Misafir'}
          loggingOut={logout.isPending}
          onMenu={() => setMenuOpen(true)}
          onLogout={() => logout.mutate()}
        />

        <main className="flex-1 overflow-x-hidden px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
