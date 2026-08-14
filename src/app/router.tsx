import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ORG_KIND, ROUTES } from '@/constants';
import { TRACK_PATH } from '@/features/orders';
import { PageLoader } from '@/components/ui/PageLoader';
import { RequireOrgKind, RequirePlatformAdmin } from './guards';

// PLAN §17.2 — panel bazlı kod bölme. Her panel ayrı chunk.
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const InvitePage = lazy(() => import('@/pages/auth/InvitePage'));
const OrderTrackPage = lazy(() => import('@/pages/public/OrderTrackPage'));
const PanelLayout = lazy(() => import('@/app/layout/PanelLayout'));

const OrdersPage = lazy(() => import('@/pages/shared/OrdersPage'));
const AccountsPage = lazy(() => import('@/pages/shared/AccountsPage'));
const ServicePage = lazy(() => import('@/pages/shared/ServicePage'));
const ReturnsPage = lazy(() => import('@/pages/shared/ReturnsPage'));
const SshPage = lazy(() => import('@/pages/shared/SshPage'));
const AnnouncementsPage = lazy(() => import('@/pages/shared/AnnouncementsPage'));
const ReportsPage = lazy(() => import('@/pages/shared/ReportsPage'));
const FinancePage = lazy(() => import('@/pages/retailer/FinancePage'));
const RetailerTedarikcilerPage = lazy(() => import('@/pages/retailer/TedarikcilerPage'));
const RetailerProductManagementPage = lazy(() => import('@/pages/retailer/ProductManagementPage'));
const RetailerStockPage = lazy(() => import('@/pages/retailer/StockPage'));

const ProductsPage = lazy(() => import('@/pages/manufacturer/ProductsPage'));
const StockPage = lazy(() => import('@/pages/manufacturer/StockPage'));
const ManufacturerCatalogPage = lazy(() => import('@/pages/manufacturer/CatalogPage'));
const TeamPage = lazy(() => import('@/pages/manufacturer/TeamPage'));
const CustomersPage = lazy(() => import('@/pages/manufacturer/CustomersPage'));
const ManufacturerHome = lazy(() => import('@/pages/manufacturer/ManufacturerHome'));
const CatalogPage = lazy(() => import('@/pages/retailer/CatalogPage'));
const CartPage = lazy(() => import('@/pages/retailer/CartPage'));
const RetailerHome = lazy(() => import('@/pages/retailer/RetailerHome'));
const RetailerTeamPage = lazy(() => import('@/pages/retailer/RetailerTeamPage'));

const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminManufacturersPage = lazy(() => import('@/pages/admin/AdminManufacturersPage'));
const AdminRetailersPage = lazy(() => import('@/pages/admin/AdminRetailersPage'));
const AdminRelationshipsPage = lazy(() => import('@/pages/admin/AdminRelationshipsPage'));
const AdminRequestsPage = lazy(() => import('@/pages/admin/AdminRequestsPage'));
const AdminLeadsPage = lazy(() => import('@/pages/admin/AdminLeadsPage'));

function lazyRoute(element: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to={ROUTES.login} replace /> },
  { path: ROUTES.login, element: lazyRoute(<LoginPage />) },
  // Davet linki oturum GEREKTİRMEZ — guard'ların dışında durur.
  { path: ROUTES.invite, element: lazyRoute(<InvitePage />) },
  // Sipariş takibi de public: bağlantı müşteriye gider, jetonu bilen görür.
  { path: `/${TRACK_PATH}/:token`, element: lazyRoute(<OrderTrackPage />) },

  {
    path: ROUTES.manufacturer,
    element: <RequireOrgKind kind={ORG_KIND.manufacturer} />,
    children: [
      {
        element: lazyRoute(<PanelLayout />),
        children: [
          { index: true, element: lazyRoute(<ManufacturerHome />) },
          { path: 'urunler', element: lazyRoute(<ProductsPage />) },
          { path: 'katalog', element: lazyRoute(<ManufacturerCatalogPage />) },
          { path: 'stok', element: lazyRoute(<StockPage />) },
          { path: 'ekip', element: lazyRoute(<TeamPage />) },
          { path: 'siparisler', element: lazyRoute(<OrdersPage />) },
          { path: 'cari', element: lazyRoute(<AccountsPage />) },
          { path: 'iade', element: lazyRoute(<ReturnsPage />) },
          { path: 'ssh', element: lazyRoute(<SshPage />) },
          { path: 'servis', element: lazyRoute(<ServicePage />) },
          { path: 'duyurular', element: lazyRoute(<AnnouncementsPage />) },
          { path: 'raporlar', element: lazyRoute(<ReportsPage />) },
          { path: 'musteriler', element: lazyRoute(<CustomersPage />) },
        ],
      },
    ],
  },
  {
    path: ROUTES.retailer,
    element: <RequireOrgKind kind={ORG_KIND.retailer} />,
    children: [
      {
        element: lazyRoute(<PanelLayout />),
        children: [
          { index: true, element: lazyRoute(<RetailerHome />) },
          { path: 'katalog', element: lazyRoute(<CatalogPage />) },
          { path: 'sepetim', element: lazyRoute(<CartPage />) },
          { path: 'finans', element: lazyRoute(<FinancePage />) },
          { path: 'siparisler', element: lazyRoute(<OrdersPage />) },
          { path: 'cari', element: lazyRoute(<AccountsPage />) },
          { path: 'iade', element: lazyRoute(<ReturnsPage />) },
          { path: 'ssh', element: lazyRoute(<SshPage />) },
          { path: 'servis', element: lazyRoute(<ServicePage />) },
          { path: 'duyurular', element: lazyRoute(<AnnouncementsPage />) },
          { path: 'raporlar', element: lazyRoute(<ReportsPage />) },
          { path: 'tedarikcilerim', element: lazyRoute(<RetailerTedarikcilerPage />) },
          { path: 'urun-yonetimi', element: lazyRoute(<RetailerProductManagementPage />) },
          { path: 'stok', element: lazyRoute(<RetailerStockPage />) },
          { path: 'ekip', element: lazyRoute(<RetailerTeamPage />) },
        ],
      },
    ],
  },

  {
    path: ROUTES.admin,
    element: <RequirePlatformAdmin />,
    children: [
      {
        element: lazyRoute(<AdminLayout />),
        children: [
          { index: true, element: <Navigate to={ROUTES.adminManufacturers} replace /> },
          { path: 'uretici', element: lazyRoute(<AdminManufacturersPage />) },
          { path: 'perakendeci', element: lazyRoute(<AdminRetailersPage />) },
          { path: 'iliskiler', element: lazyRoute(<AdminRelationshipsPage />) },
          { path: 'talepler', element: lazyRoute(<AdminRequestsPage />) },
          { path: 'adaylar', element: lazyRoute(<AdminLeadsPage />) },
        ],
      },
    ],
  },

  { path: '*', element: <Navigate to={ROUTES.login} replace /> },
]);
