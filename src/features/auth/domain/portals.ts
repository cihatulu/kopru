/**
 * Giriş ekranının sekme yapısı — SAF veri (A20: react/supabase yok).
 *
 * Beş sekme, dört giriş yolu + admin. Sekmeler yalnızca SUNUM biçimidir;
 * sunucuya giden `portal` + `mode` çifti değişmedi, dolayısıyla `login`
 * Edge Function'ının doğrulama mantığı aynen geçerli.
 */
import { ORG_KIND, type OrgKind } from '@/constants';

export type Portal = OrgKind | 'admin';
export type LoginMode = 'subscriber' | 'guest';

export type TabId =
  | 'member-manufacturer'
  | 'member-retailer'
  | 'guest-manufacturer'
  | 'guest-retailer'
  | 'admin';

export interface LoginTab {
  id: TabId;
  /** Sekme başlığı — iki satıra bölünecek şekilde. */
  label: string;
  portal: Portal;
  mode: LoginMode;
  /** Sekme seçilince gösterilen tek satırlık açıklama. */
  hint: string;
  /** Misafir sekmelerinde istenen sponsor VKN alanının etiketi. */
  sponsorLabel?: string;
}

export const LOGIN_TABS: readonly LoginTab[] = [
  {
    id: 'member-manufacturer',
    label: 'ÜYE ÜRETİCİ',
    portal: ORG_KIND.manufacturer,
    mode: 'subscriber',
    hint: 'Sipariş yönetimi ve operasyon takibi',
  },
  {
    id: 'member-retailer',
    label: 'ÜYE MAĞAZA',
    portal: ORG_KIND.retailer,
    mode: 'subscriber',
    hint: 'Katalog, sipariş ve cari takibi',
  },
  {
    id: 'guest-manufacturer',
    label: 'MİSAFİR ÜRETİCİ',
    portal: ORG_KIND.manufacturer,
    mode: 'guest',
    hint: 'Sizi ekleyen perakendecinin vergi numarası ile',
    sponsorLabel: 'Sizi ekleyen perakendecinin vergi numarası',
  },
  {
    id: 'guest-retailer',
    label: 'MİSAFİR MAĞAZA',
    portal: ORG_KIND.retailer,
    mode: 'guest',
    hint: 'Sizi ekleyen üreticinin vergi numarası ile',
    sponsorLabel: 'Sizi ekleyen üreticinin vergi numarası',
  },
  {
    id: 'admin',
    label: 'ADMIN',
    portal: 'admin',
    mode: 'subscriber',
    hint: 'Platform yönetimi',
  },
] as const;

export function tabById(id: TabId): LoginTab {
  const tab = LOGIN_TABS.find((t) => t.id === id);
  if (!tab) throw new Error(`Bilinmeyen sekme: ${id}`);
  return tab;
}

/** Yalnız admin e-posta ile girer; diğer herkes vergi numarası (kullanıcı kodu) ile. */
export function usesEmail(tab: LoginTab): boolean {
  return tab.portal === 'admin';
}

export function isGuestTab(tab: LoginTab): boolean {
  return tab.mode === 'guest' && tab.portal !== 'admin';
}
