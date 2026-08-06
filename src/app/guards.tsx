import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthSession } from '@/features/auth';
import { PageLoader } from '@/components/ui/PageLoader';
import { ROUTES, type OrgKind } from '@/constants';
import { isAdminHost } from '@/lib/tenant';
import { roleHomePath } from './roleHome';

/** Oturum yoksa giriş ekranına gönderir. */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { data: user, isLoading } = useAuthSession();

  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to={ROUTES.login} replace />;
  return <>{children ?? <Outlet />}</>;
}

/**
 * Org tipi kilidi. Perakendeci adres çubuğuna elle `/m/...` yazsa bile
 * kendi paneline geri gönderilir.
 */
export function RequireOrgKind({ kind, children }: { kind: OrgKind; children?: ReactNode }) {
  const { data: user, isLoading } = useAuthSession();

  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to={ROUTES.login} replace />;
  if (user.org?.kind !== kind) return <Navigate to={roleHomePath(user)} replace />;
  return <>{children ?? <Outlet />}</>;
}

/**
 * Platform yönetimi. İki katmanlı: kullanıcı gerçekten admin olmalı VE
 * sayfa rezerve admin subdomain'inden açılmış olmalı (her iki eski projedeki kural).
 */
export function RequirePlatformAdmin({ children }: { children?: ReactNode }) {
  const { data: user, isLoading } = useAuthSession();

  if (isLoading) return <PageLoader />;
  if (!user?.isPlatformAdmin || !isAdminHost()) {
    return <Navigate to={roleHomePath(user)} replace />;
  }
  return <>{children ?? <Outlet />}</>;
}

/**
 * Yalnız abonelere açık bölümler (plan gerektiren modüller).
 * Misafir org buraya girmeye çalışırsa kendi dar paneline döner.
 * KİLİTLİ KURAL 15: bu yalnız birinci katmandır — RLS/Edge ikinci katmandır.
 */
export function RequireSubscriber({ children }: { children?: ReactNode }) {
  const { data: user, isLoading } = useAuthSession();

  if (isLoading) return <PageLoader />;
  if (!user?.org?.isSubscriber) return <Navigate to={roleHomePath(user)} replace />;
  return <>{children ?? <Outlet />}</>;
}
