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

/** Miktar: gereksiz sıfırları atar (2.000 → 2, 1.500 → 1,5). */
export function formatQuantity(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 }).format(n);
}
