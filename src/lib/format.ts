import { DEFAULT_CURRENCY } from '@/constants';

const money = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: DEFAULT_CURRENCY,
  minimumFractionDigits: 2,
});

const dateTime = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const dateOnly = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' });

export function formatMoney(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  return money.format(Number.isFinite(n) ? n : 0);
}

export function formatDateTime(value: string | null | undefined): string {
  return value ? dateTime.format(new Date(value)) : '—';
}

export function formatDate(value: string | null | undefined): string {
  return value ? dateOnly.format(new Date(value)) : '—';
}

/**
 * Kullanıcının yazdığı sayıyı okur — hem "1.234,5" hem "1234.5" biçimi.
 *
 * Ayrım kurala bağlanır: SON ayraç hangisiyse ondalık ayıracı odur, diğeri
 * binlik ayıracıdır ve atılır. Türkçe klavyeden gelen "2,5" ile kopyala-yapıştır
 * gelen "2.5" aynı ekrana düşer; birini desteklememek kullanıcıyı yanıltır.
 *
 * İşaret kısıtı YOK — kısıtı çağıran koyar (stokta negatif yasak, cari tutarında
 * sıfırdan büyük olmalı). Ortak olan yalnız ayrıştırmadır.
 */
export function parseDecimal(raw: string): number | null {
  const text = raw.trim();
  if (text === '') return null;

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');

  let normalized: string;
  if (lastComma > lastDot) {
    normalized = text.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    normalized = text.replace(/,/g, '');
  } else {
    normalized = text;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Miktar: gereksiz sıfırları atar (2.000 → 2, 1.500 → 1,5). */
export function formatQuantity(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 }).format(n);
}
