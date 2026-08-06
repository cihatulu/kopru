/**
 * Subdomain üretimi ve doğrulaması — SAF (A20).
 * Yükseltme sırasında admin'e önerilir; DB CHECK son sözü söyler.
 */
import { RESERVED_SUBDOMAINS } from '@/constants';

const TR_MAP: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
  Ç: 'c', Ğ: 'g', İ: 'i', I: 'i', Ö: 'o', Ş: 's', Ü: 'u',
};

/** Firma adından okunabilir bir subdomain önerir. */
export function suggestSubdomain(companyName: string): string {
  const ascii = [...companyName].map((ch) => TR_MAP[ch] ?? ch).join('');
  return ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
    .replace(/-+$/, '');
}

export type SubdomainError = 'empty' | 'format' | 'reserved';

/**
 * Kaydedilecek biçim. Büyük harf ve çevre boşluğu HATA DEĞİL, normalize edilir —
 * kullanıcıya "Sahin yazdın, sahin yaz" demek gereksiz sürtünme. Kaydedilen değer
 * her zaman bu fonksiyonun çıktısıdır.
 */
export function normalizeSubdomain(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * DB CHECK ile aynı kural: 3-32 karakter, a-z0-9-, baş/son tire olamaz.
 * Girdiyi önce normalize eder; bu yüzden 'Sahin' geçerlidir, 'sahin_x' değildir.
 */
export function validateSubdomain(value: string): SubdomainError | null {
  const v = normalizeSubdomain(value);
  if (!v) return 'empty';
  if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(v)) return 'format';
  if (RESERVED_SUBDOMAINS.includes(v as (typeof RESERVED_SUBDOMAINS)[number])) return 'reserved';
  return null;
}

export const SUBDOMAIN_MESSAGES: Record<SubdomainError, string> = {
  empty: 'Subdomain zorunludur.',
  format: 'Yalnız küçük harf, rakam ve tire; 3-32 karakter, tire ile başlayıp bitemez.',
  reserved: 'Bu subdomain sistem tarafından ayrılmıştır.',
};
