import { ORG_KIND, ROUTES } from '@/constants';
import type { SessionUser } from '@/features/auth';

/**
 * Oturum açan kullanıcının ana sayfası.
 * Misafir org da abone org ile aynı panele düşer — farkı modül kapsamı belirler,
 * ayrı bir arayüz yoktur (köprü çağındaki "hayalet müşteri" ayrımı kaldırıldı).
 */
export function roleHomePath(user: SessionUser | null | undefined): string {
  if (!user) return ROUTES.login;
  if (user.isPlatformAdmin) return ROUTES.admin;

  switch (user.org?.kind) {
    case ORG_KIND.manufacturer:
      return ROUTES.manufacturer;
    case ORG_KIND.retailer:
      return ROUTES.retailer;
    default:
      return ROUTES.login;
  }
}
