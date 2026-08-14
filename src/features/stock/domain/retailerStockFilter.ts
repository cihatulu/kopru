/** Perakendeci stok tablosunun kolon süzgeçleri — SAF (A20). */

export interface StockFilters {
  manufacturer: string;
  category: string;
  code: string;
  name: string;
  dimensions: string;
}

export const EMPTY_STOCK_FILTERS: StockFilters = {
  manufacturer: '',
  category: '',
  code: '',
  name: '',
  dimensions: '',
};

/** Süzülebilir en küçük satır gösterimi — api tipine bağımlı olmasın. */
export interface FilterableStockRow {
  manufacturerName: string;
  category: string | null;
  code: string;
  name: string;
  widthCm: number | null;
  depthCm: number | null;
  heightCm: number | null;
}

/**
 * Ölçülerin okunabilir metni. Süzgeç bu metin üzerinde çalışır ki kullanıcı
 * ekranda GÖRDÜĞÜ şeyi arayabilsin ("180 x 90").
 */
export function dimensionsText(row: FilterableStockRow): string {
  if (!row.widthCm && !row.depthCm && !row.heightCm) return '';
  return `${row.widthCm ?? '-'} x ${row.depthCm ?? '-'} x ${row.heightCm ?? '-'}`;
}

/**
 * Türkçe duyarlı, büyük/küçük harf gözetmeyen içerme.
 *
 * `toLowerCase()` yetmez: "İSTANBUL" JavaScript'te 'i' + birleşen noktaya
 * dönüşür ve "istanbul" ile eşleşmez.
 */
const includesTr = (haystack: string, needle: string) =>
  haystack.toLocaleLowerCase('tr').includes(needle.toLocaleLowerCase('tr'));

export function isStockFilterActive(f: StockFilters): boolean {
  return (Object.keys(f) as (keyof StockFilters)[]).some((k) => f[k].trim() !== '');
}

/** Boş süzgeç herkesi geçirir; dolu olanların HEPSİ tutmalıdır (VE mantığı). */
export function filterStockRows<T extends FilterableStockRow>(
  rows: readonly T[],
  f: StockFilters,
): T[] {
  return rows.filter((row) => {
    if (f.manufacturer.trim() && !includesTr(row.manufacturerName, f.manufacturer.trim())) {
      return false;
    }
    if (f.category.trim() && !includesTr(row.category ?? '', f.category.trim())) return false;
    if (f.code.trim() && !includesTr(row.code, f.code.trim())) return false;
    if (f.name.trim() && !includesTr(row.name, f.name.trim())) return false;
    if (f.dimensions.trim() && !includesTr(dimensionsText(row), f.dimensions.trim())) return false;
    return true;
  });
}
