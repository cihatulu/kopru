import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthSession } from '@/features/auth';
import { useMyProductPermission } from '@/features/counterparties';
import { PageLoader } from '@/components/ui/PageLoader';
import { ROUTES, type OrgKind, type OrgRole } from '@/constants';
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

/**
 * Misafir üreticinin ÜRÜN YÖNETİMİ kilidi.
 *
 * Anahtarı üye perakendeci açar; kapalıyken misafir üretici kendi kataloğunu
 * da yönetemez. Menüden gizlemek birinci katman, bu ikinci; sunucuda
 * `manufacturer_may_manage_products()` üçüncüdür.
 */
export function RequireProductAccess({ children }: { children?: ReactNode }) {
  const { data: user, isLoading } = useAuthSession();
  const allowed = useMyProductPermission();

  if (isLoading) return <PageLoader />;
  if (!allowed) return <Navigate to={roleHomePath(user)} replace />;
  return <>{children ?? <Outlet />}</>;
}

/**
 * Rol kilidi. `navFor` bazı bölümleri personelden (ve kimini muhasebeciden)
 * GİZLİYOR ama rotalar açıktı: personel adres çubuğuna yazarak cari ve finans
 * ekranlarına girebiliyordu.
 *
 * İzin listesi menüdeki gizleme ile BİREBİR aynı tutulur; ayrışırsa kullanıcı
 * menüde görmediği bir sayfaya girer ya da gördüğü sayfadan geri atılır.
 */
export function RequireOrgRole({ roles, children }: { roles: OrgRole[]; children?: ReactNode }) {
  const { data: user, isLoading } = useAuthSession();

  if (isLoading) return <PageLoader />;
  if (!user?.orgRole || !roles.includes(user.orgRole)) {
    return <Navigate to={roleHomePath(user)} replace />;
  }
  return <>{children ?? <Outlet />}</>;
}
