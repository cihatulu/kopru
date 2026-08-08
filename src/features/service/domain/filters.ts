/** SSH ve iade listelerinin filtre mantığı — SAF (A20). */

export interface ServiceFilters {
  /** 'all' = durum filtresi yok. */
  status: string;
  /** Karşı tarafın org id'si; 'all' = hepsi. */
  partyOrgId: string;
  /** 'YYYY-MM-DD' — dahil. */
  from: string;
  /** 'YYYY-MM-DD' — dahil (gün sonuna kadar). */
  to: string;
}

export const EMPTY_FILTERS: ServiceFilters = {
  status: 'all',
  partyOrgId: 'all',
  from: '',
  to: '',
};

export function hasActiveFilter(f: ServiceFilters): boolean {
  return f.status !== 'all' || f.partyOrgId !== 'all' || f.from !== '' || f.to !== '';
}

export interface DateRange {
  /** `created_at >= gte` */
  gte?: string;
  /** `created_at < lt` — üst sınır DIŞLAYICI. */
  lt?: string;
}

/**
 * Tarih aralığını sorgu sınırlarına çevirir.
 *
 * Üst sınır neden dışlayıcı: `created_at` bir zaman damgasıdır. "31 Ağustos'a
 * kadar" için `<= '2026-08-31'` yazmak, o tarihi 00:00 olarak yorumlar ve
 * 31 Ağustos günü açılan HER talebi listeden düşürür. Doğrusu ertesi günün
 * başlangıcından küçük olmasıdır.
 */
export function toDateRange(f: ServiceFilters): DateRange {
  const range: DateRange = {};
  if (f.from) range.gte = `${f.from}T00:00:00.000Z`;
  if (f.to) range.lt = nextDayIso(f.to);
  return range;
}

/** 'YYYY-MM-DD' → ertesi günün ISO başlangıcı. Ay/yıl sınırını da geçer. */
function nextDayIso(day: string): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

/**
 * Karşı taraf filtresini hangi kolona uygulayacağımız.
 *
 * Satırda iki uç da denormalize durur (A16). Ben üreticiysem karşı taraf
 * perakendecidir; filtre `retailer_org_id` üzerine binmelidir. Ters kolona
 * uygulamak sessizce BOŞ liste döndürürdü.
 */
export function partyColumn(myKind: string): 'retailer_org_id' | 'manufacturer_org_id' {
  return myKind === 'manufacturer' ? 'retailer_org_id' : 'manufacturer_org_id';
}

export interface FilterOps {
  /** Uygulanacak eşitlikler: [kolon, değer]. */
  equals: [string, string][];
  /** `created_at >=` */
  gte?: string;
  /** `created_at <` */
  lt?: string;
}

/**
 * Filtreleri sorgu işlemlerine çevirir — SAF.
 *
 * Neden supabase sorgusunu sarmalayan bir yardımcı DEĞİL: jenerik bir sarmalayıcı
 * PostgREST builder'ının tipini kaybediyor ve zincirin geri kalanı (`.or`, `.limit`)
 * `any`'ye düşüyordu. Filtreyi veri olarak üretip çağrı yerinde uygulamak hem
 * tipleri korur hem bu katmanı saf tutar (A20).
 *
 * Keyset sayfalama BOZULMAZ: sıralama ve imleç karşılaştırması aynı kalır,
 * filtre yalnız kümeyi daraltır (A17).
 */
export function filterOps(f: ServiceFilters, myKind: string): FilterOps {
  const equals: [string, string][] = [];
  if (f.status !== 'all') equals.push(['status', f.status]);
  if (f.partyOrgId !== 'all') equals.push([partyColumn(myKind), f.partyOrgId]);

  const range = toDateRange(f);
  return {
    equals,
    ...(range.gte ? { gte: range.gte } : {}),
    ...(range.lt ? { lt: range.lt } : {}),
  };
}

/** Tarih aralığı ters verilmişse filtre anlamsızdır — kullanıcı uyarılır. */
export function isRangeInverted(f: ServiceFilters): boolean {
  if (!f.from || !f.to) return false;
  return f.from > f.to;
}
