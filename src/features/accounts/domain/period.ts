/** Cari ekstre dönem mantığı — SAF (A20). */

export interface Period {
  /** 'YYYY-MM-DD' — dahil. Boşsa başlangıçtan beri. */
  from: string;
  /** 'YYYY-MM-DD' — dahil (gün sonuna kadar). Boşsa bugüne kadar. */
  to: string;
}

export const EMPTY_PERIOD: Period = { from: '', to: '' };

export interface PeriodBounds {
  /** `created_at >= from` */
  from: string | null;
  /** `created_at < to` — üst sınır DIŞLAYICI. */
  to: string | null;
}

/**
 * Dönemi sorgu sınırlarına çevirir.
 *
 * Üst sınır dışlayıcıdır: `<= '2026-08-31'` yazmak o tarihi gece yarısı olarak
 * yorumlar ve 31 Ağustos'ta girilen her hareketi ekstrenin dışında bırakır —
 * mutabakatta en can sıkıcı hata tam olarak budur.
 */
export function toBounds(p: Period): PeriodBounds {
  return {
    from: p.from ? `${p.from}T00:00:00.000Z` : null,
    to: p.to ? nextDayIso(p.to) : null,
  };
}

function nextDayIso(day: string): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

export function isPeriodActive(p: Period): boolean {
  return p.from !== '' || p.to !== '';
}

export function isPeriodInverted(p: Period): boolean {
  if (!p.from || !p.to) return false;
  return p.from > p.to;
}

/** Bu ay — ekranın varsayılan hızlı seçimi. */
export function currentMonth(now: Date = new Date()): Period {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const first = new Date(Date.UTC(y, m, 1));
  const last = new Date(Date.UTC(y, m + 1, 0));
  return { from: iso(first), to: iso(last) };
}

/** Geçen ay. */
export function previousMonth(now: Date = new Date()): Period {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  return { from: iso(first), to: iso(last) };
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface LedgerSummary {
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  entryCount: number;
}

/**
 * Özet tutarlı mı?
 *
 * Kapanış = açılış + borç − alacak olmak ZORUNDA. Tutmuyorsa sunucudan gelen
 * sayılar birbiriyle çelişiyor demektir ve ekranda mutabakat için kullanılamaz;
 * kullanıcıyı yanlış bir toplamla göndermektense uyarmak doğrudur.
 */
export function isSummaryConsistent(s: LedgerSummary): boolean {
  const expected = s.openingBalance + s.totalDebit - s.totalCredit;
  // Kuruş yuvarlaması için tolerans; kayan nokta eşitliği aranmaz.
  return Math.abs(expected - s.closingBalance) < 0.005;
}
