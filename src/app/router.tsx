import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ORG_KIND, ROUTES } from '@/constants';
import { PageLoader } from '@/components/ui/PageLoader';
import { RequireOrgKind, RequirePlatformAdmin } from './guards';

// PLAN §17.2 — panel bazlı kod bölme. Her panel ayrı chunk.
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const PanelLayout = lazy(() => import('@/app/layout/PanelLayout'));
const CounterpartiesPage = lazy(() => import('@/pages/shared/CounterpartiesPage'));
const ManufacturerHome = lazy(() => import('@/pages/manufacturer/ManufacturerHome'));
const RetailerHome = lazy(() => import('@/pages/retailer/RetailerHome'));

const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminManufacturersPage = lazy(() => import('@/pages/admin/AdminManufacturersPage'));
const AdminRetailersPage = lazy(() => import('@/pages/admin/AdminRetailersPage'));
const AdminRelationshipsPage = lazy(() => import('@/pages/admin/AdminRelationshipsPage'));
const AdminRequestsPage = lazy(() => import('@/pages/admin/AdminRequestsPage'));

function lazyRoute(element: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to={ROUTES.login} replace /> },
  { path: ROUTES.login, element: lazyRoute(<LoginPage />) },

  {
    path: ROUTES.manufacturer,
    element: <RequireOrgKind kind={ORG_KIND.manufacturer} />,
    children: [
      {
        element: lazyRoute(<PanelLayout />),
        children: [
          { index: true, element: lazyRoute(<ManufacturerHome />) },
          { path: 'musteriler', element: lazyRoute(<CounterpartiesPage />) },
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
          { path: 'tedarikcilerim', element: lazyRoute(<CounterpartiesPage />) },
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
        ],
      },
    ],
  },

  { path: '*', element: <Navigate to={ROUTES.login} replace /> },
]);
