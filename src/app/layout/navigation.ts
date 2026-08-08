/**
 * Panel menüleri — SAF veri.
 *
 * furniture-platform'daki üretici menüsü temel alındı; KÖPRÜ'de karşılığı olan
 * maddeler korundu, olmayanlar (AI Raporları gibi) dış servis gerektirdiği için
 * şimdilik listede yok.
 */
import { ORG_KIND, ROUTES, type OrgKind } from '@/constants';

export interface NavItem {
  to: string;
  label: string;
  /** 24x24 viewBox içinde çizilen SVG path'i. */
  icon: string;
  /** Bu maddeyi görebilmek için gereken modül (plan gating, kilitli kural 15). */
  module?: string;
  /**
   * Bu maddenin altına yerleştirilecek yuva adı.
   *
   * Menü SAF veridir ve veri çekmez (A20); ağaç gibi dinamik içerik ilgili
   * feature'ın bileşeni tarafından üretilip layout'a yuva olarak verilir.
   */
  slot?: 'catalog-tree';
}

const ICONS = {
  home: 'M3 10.5L12 3l9 7.5M5 9.5V21h14V9.5M9 21v-6h6v6',
  box: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  catalog: 'M4 5h16M4 12h16M4 19h10',
  users: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87',
  wallet: 'M3 7h15a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 0l2-3h11M17 13h.01',
  cart: 'M3 4h2l2.4 11.5a1 1 0 001 .8h8.7a1 1 0 001-.8L21 8H6M9 21h.01M18 21h.01',
  ret: 'M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3',
  wrench: 'M14.7 6.3a4 4 0 01-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 015.4-5.4l-2.6 2.6-1.4-1.4 2.6-2.6z',
  report: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  megaphone: 'M3 11v2a1 1 0 001 1h2l4 4V6L6 10H4a1 1 0 00-1 1zM16 8a5 5 0 010 8',
  stock: 'M4 7h16v13H4zM4 7l2-4h12l2 4M9 12h6',
  team: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
} as const;

export const MANUFACTURER_NAV: readonly NavItem[] = [
  { to: ROUTES.manufacturer, label: 'Anasayfa', icon: ICONS.home },
  { to: `${ROUTES.manufacturer}/urunler`, label: 'Ürün Yönetimi', icon: ICONS.box },
  {
    to: `${ROUTES.manufacturer}/katalog`,
    label: 'Ürün Kataloğu',
    icon: ICONS.catalog,
    slot: 'catalog-tree',
  },
  { to: `${ROUTES.manufacturer}/stok`, label: 'Stok Yönetimi', icon: ICONS.stock },
  { to: `${ROUTES.manufacturer}/musteriler`, label: 'Müşteri Yönetimi', icon: ICONS.users },
  { to: `${ROUTES.manufacturer}/cari`, label: 'Cari Hesaplar', icon: ICONS.wallet },
  { to: `${ROUTES.manufacturer}/siparisler`, label: 'Siparişler', icon: ICONS.cart },
  { to: `${ROUTES.manufacturer}/servis`, label: 'İade ve SSH', icon: ICONS.ret, module: 'ssh' },
  { to: `${ROUTES.manufacturer}/raporlar`, label: 'Raporlar', icon: ICONS.report, module: 'reports' },
  {
    to: `${ROUTES.manufacturer}/duyurular`,
    label: 'Duyurular',
    icon: ICONS.megaphone,
    module: 'announcements',
  },
  { to: `${ROUTES.manufacturer}/ekip`, label: 'Ekip Yönetimi', icon: ICONS.team },
] as const;

export const RETAILER_NAV: readonly NavItem[] = [
  { to: ROUTES.retailer, label: 'Anasayfa', icon: ICONS.home },
  { to: `${ROUTES.retailer}/katalog`, label: 'Ürün Kataloğu', icon: ICONS.catalog },
  { to: `${ROUTES.retailer}/siparisler`, label: 'Siparişlerim', icon: ICONS.cart },
  { to: `${ROUTES.retailer}/cari`, label: 'Cari Hesabım', icon: ICONS.wallet },
  { to: `${ROUTES.retailer}/servis`, label: 'İade ve SSH', icon: ICONS.ret, module: 'ssh' },
  { to: `${ROUTES.retailer}/finans`, label: 'Finans', icon: ICONS.wallet, module: 'finance' },
  { to: `${ROUTES.retailer}/raporlar`, label: 'Raporlar', icon: ICONS.report, module: 'reports' },
  {
    to: `${ROUTES.retailer}/duyurular`,
    label: 'Duyurular',
    icon: ICONS.megaphone,
    module: 'announcements',
  },
  { to: `${ROUTES.retailer}/tedarikcilerim`, label: 'Tedarikçilerim', icon: ICONS.users },
] as const;

/**
 * Org'un görebileceği menü.
 *
 * Plan gating kaldırıldı — tüm kullanıcılar tüm menü maddelerini görür.
 * `enabledModules` parametresi geriye dönük uyumluluk için korunuyor.
 */
export function navFor(kind: OrgKind, _enabledModules: string[]): NavItem[] {
  return kind === ORG_KIND.manufacturer
    ? [...MANUFACTURER_NAV]
    : [...RETAILER_NAV];
}
