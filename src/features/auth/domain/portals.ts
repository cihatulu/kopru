/**
 * Giriş ekranının kapı yapısı — SAF veri (A20: react/supabase yok).
 *
 * Kullanıcının tarif ettiği davranış: açılışta hiçbir alan görünmez, önce portal
 * seçilir; üretici ve perakendeci portallarının altında iki giriş yolu vardır.
 */
import { ORG_KIND, type OrgKind } from '@/constants';

export type Portal = OrgKind | 'admin';
export type LoginMode = 'subscriber' | 'guest';

export interface PortalMeta {
  id: Portal;
  title: string;
  subtitle: string;
}

/** Açılış ekranındaki üç buton. Bu üçüne basılmadan hiçbir form alanı gösterilmez. */
export const PORTALS: readonly PortalMeta[] = [
  {
    id: ORG_KIND.manufacturer,
    title: 'Üretici Üye Girişi',
    subtitle: 'Ürün kataloğu, gelen siparişler, sevkiyat ve cari takibi',
  },
  {
    id: ORG_KIND.retailer,
    title: 'Perakendeci Üye Girişi',
    subtitle: 'Sipariş verme, mağaza stoğu, tedarikçi cari hesapları',
  },
  {
    id: 'admin',
    title: 'Admin',
    subtitle: 'Üretici ve perakendeci yönetimi',
  },
] as const;

export interface ModeMeta {
  id: LoginMode;
  title: string;
  description: string;
  /** Misafir modunda istenen sponsor VKN'sinin etiketi. */
  sponsorLabel?: string;
}

/**
 * Portal → iki giriş yolu.
 *
 * `guest`: bizden hizmet almayan taraf. Kendisini sisteme ekleyen abonenin VKN'sini
 * girmek ZORUNDADIR — bu bir kolaylık değil, kimlik faktörüdür (sunucuda doğrulanır).
 */
export const MODES: Record<OrgKind, readonly ModeMeta[]> = {
  [ORG_KIND.manufacturer]: [
    {
      id: 'subscriber',
      title: 'Bizden hizmet alan üretici',
      description: 'Kendi VKN/T.C. numaranız ve şifrenizle giriş yapın.',
    },
    {
      id: 'guest',
      title: 'Perakendeci daveti ile üretici',
      description: 'Sizi sisteme ekleyen perakendecinin vergi numarası gereklidir.',
      sponsorLabel: 'Sizi ekleyen perakendecinin VKN’si',
    },
  ],
  [ORG_KIND.retailer]: [
    {
      id: 'subscriber',
      title: 'Bizden hizmet alan perakendeci',
      description: 'Kendi VKN/T.C. numaranız ve şifrenizle giriş yapın.',
    },
    {
      id: 'guest',
      title: 'Üretici daveti ile perakendeci',
      description: 'Sizi sisteme ekleyen üreticinin vergi numarası gereklidir.',
      sponsorLabel: 'Sizi ekleyen üreticinin VKN’si',
    },
  ],
} as const;

export function modesFor(portal: Portal): readonly ModeMeta[] {
  return portal === 'admin' ? [] : MODES[portal];
}

export function portalTitle(portal: Portal): string {
  return PORTALS.find((p) => p.id === portal)?.title ?? '';
}
