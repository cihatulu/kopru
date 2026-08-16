import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthSession, useLogout } from '@/features/auth';
import { CatalogTree, RetailerCatalogTree } from '@/features/catalog';
import { CartProvider, useCart } from '@/features/orders';
import { useUnreadAnnouncements } from '@/features/announcements';
import { useMyProductPermission, usePendingConnectionCount } from '@/features/counterparties';
import { ORG_KIND, ROUTES } from '@/constants';
import { navFor } from './navigation';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

/** retici ve perakendeci panellerinin ortak iskeleti  sol men + st ubuk. */
export default function PanelLayout() {
  const { data: user } = useAuthSession();
  const org = user?.org;
  if (!org) return null;

  const isManufacturer = org.kind === ORG_KIND.manufacturer;

  if (!isManufacturer) {
    return (
      <CartProvider>
        <RetailerPanel />
      </CartProvider>
    );
  }

  return <ManufacturerPanel />;
}

/** Perakendeci paneli  CartProvider icinde calisir. */
function RetailerPanel() {
  const { data: user } = useAuthSession();
  const logout = useLogout();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { totals } = useCart();
  const { unreadCount } = useUnreadAnnouncements();
  const { data: pendingConnections } = usePendingConnectionCount(user?.org?.id);

  const org = user?.org;
  if (!org) return null;

  const items = navFor(org.kind, org.enabledModules, user.orgRole, org.isSubscriber);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        items={items}
        companyName={org.companyName}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        badges={{ announcements: unreadCount, connections: pendingConnections }}
        slots={{ 'catalog-tree': <RetailerCatalogTree /> }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          panelLabel="Perakendeci Paneli"
          userName={user.fullName ?? org.companyName}
          orgId={org.id}
          isSubscriber={org.isSubscriber}
          badge={
            user.orgRole !== 'owner'
              ? `${org.companyName} Personeli`
              : org.isSubscriber
                ? 'Üye'
                : 'Misafir'
          }
          cartCount={totals.itemCount}
          onCartClick={() => void navigate(`${ROUTES.retailer}/sepetim`)}
          unreadAnnouncementsCount={unreadCount}
          onAnnouncementsClick={() => void navigate(`${ROUTES.retailer}/duyurular`)}
          pendingConnectionsCount={pendingConnections}
          onConnectionsClick={() => void navigate(`${ROUTES.retailer}/tedarikcilerim`)}
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

/** Uretici paneli. */
function ManufacturerPanel() {
  const { data: user } = useAuthSession();
  const logout = useLogout();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { unreadCount } = useUnreadAnnouncements();
  const { data: pendingConnections } = usePendingConnectionCount(user?.org?.id);
  // Misafir üreticide Ürün Yönetimi anahtara bağlıdır.
  const canManageProducts = useMyProductPermission();

  const org = user?.org;
  if (!org) return null;

  const items = navFor(
    org.kind,
    org.enabledModules,
    user.orgRole,
    org.isSubscriber,
    canManageProducts,
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        items={items}
        companyName={org.companyName}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        badges={{ announcements: unreadCount, connections: pendingConnections }}
        slots={{ 'catalog-tree': <CatalogTree ownerOrgId={org.id} /> }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          panelLabel="Üretici Paneli"
          userName={user.fullName ?? org.companyName}
          orgId={org.id}
          isSubscriber={org.isSubscriber}
          badge={
            user.orgRole !== 'owner'
              ? `${org.companyName} Personeli`
              : org.isSubscriber
                ? 'Üye'
                : 'Misafir'
          }
          unreadAnnouncementsCount={unreadCount}
          onAnnouncementsClick={() => void navigate(`${ROUTES.manufacturer}/duyurular`)}
          pendingConnectionsCount={pendingConnections}
          onConnectionsClick={() => void navigate(`${ROUTES.manufacturer}/musteriler`)}
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
