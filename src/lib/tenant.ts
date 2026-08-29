import { RESERVED_ADMIN_SUBDOMAIN, RESERVED_SUBDOMAINS } from '@/constants';

/**
 * Geçerli subdomain'i çözer.
 *
 * `app.kopru.com` → null (rezerve) · `mobilyaci.kopru.com` → 'mobilyaci'
 * Geliştirmede `?tenant=x` ile override edilebilir (yalnız VITE_ALLOW_TENANT_OVERRIDE açıkken).
 */
export function getSubdomain(host = window.location.hostname): string | null {
  if (import.meta.env.VITE_ALLOW_TENANT_OVERRIDE === 'true') {
    const override = new URLSearchParams(window.location.search).get('tenant');
    if (override) return override.toLowerCase();
  }

  const labels = host.split('.');
  // `x.localhost` ve gerçek alan adları; tek etiketli host'ta subdomain yok.
  if (labels.length < 2) return null;

  const first = labels[0]!.toLowerCase();
  if (RESERVED_SUBDOMAINS.includes(first as (typeof RESERVED_SUBDOMAINS)[number])) {
    return first === RESERVED_ADMIN_SUBDOMAIN ? first : null;
  }
  return first;
}

/**
 * Admin paneli yalnız rezerve subdomain'den açılır.
 * Geliştirme ve Vercel ortamlarında esnek erişim sağlanır.
 */
export function isAdminHost(host = window.location.hostname): boolean {
  if (host.includes('vercel.app') || host === 'localhost' || host === '127.0.0.1') {
    return true;
  }
  return getSubdomain(host) === RESERVED_ADMIN_SUBDOMAIN;
}
