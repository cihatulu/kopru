/**
 * Bir tablo satırını stok satırına çevirir — SAF (A20).
 *
 * CSV ve XLSX ayrıştırıcılarının ORTAK kuralı burada durur. İki yerde ayrı
 * yazılsaydı biri "kimliksiz satır yeni üründür" kuralını öğrenir, diğeri
 * öğrenmezdi.
 */
import { parseQuantity, type StockCsvRow } from './csv';

export type RowResult =
  | { ok: true; row: StockCsvRow }
  | { ok: false; error: { line: number; reason: string } };

/** Şablonun sütun sırası: ID, Ad, Model, Kategori, Grup, Stok. */
export function toStockRow(fields: readonly string[], line: number): RowResult {
  const productId = (fields[0] ?? '').trim();
  const productName = (fields[1] ?? '').trim();

  // Stok son sütundadır: kullanıcı sağa fazladan sütun eklemiş olabilir.
  const rawQuantity = fields[5] !== undefined ? fields[5] : fields[fields.length - 1];
  const quantity = parseQuantity(rawQuantity ?? '');

  // Kimliği olmayan satır hata değil: adı varsa YENİ ürün demektir.
  // İkisi de boşsa satırdan hiçbir şey anlaşılmaz.
  if (!productId && !productName) {
    return { ok: false, error: { line, reason: 'Ürün kimliği ve adı boş' } };
  }
  if (quantity === null) {
    return { ok: false, error: { line, reason: 'Stok değeri sayı değil veya negatif' } };
  }

  return {
    ok: true,
    row: {
      productId,
      productName,
      productCode: (fields[2] ?? '').trim(),
      category: (fields[3] ?? '').trim() || null,
      groupName: (fields[4] ?? '').trim() || null,
      quantity,
    },
  };
}

/**
 * Başlık satırı mı?
 *
 * Şablonun ilk hücresi "Ürün ID (DEĞİŞTİRMEYİN)"dir. Excel kodlamayı bozmuş
 * olabileceği için (gerçekten yaşandı: `Ürün` → `?r?n`) Türkçe karakterlere
 * GÜVENİLMEZ; ayırt edici olarak yalnız `id` aranır.
 */
export function isHeaderRow(fields: readonly string[]): boolean {
  const first = (fields[0] ?? '').trim().toLowerCase();
  if (!first) return false;

  // Kimlik sütunu uuid ise bu bir VERİ satırıdır; stok değeri bozuk olsa bile
  // başlık sayılmaz — kullanıcı o satırın atlandığını görmeli.
  if (/^[0-9a-f-]{30,}$/i.test(first)) return false;

  if (first.includes('id')) return true;

  // Excel başlığı bozabiliyor (gerçekten yaşandı: `Ürün` → `?r?n`, hatta başlık
  // 11 hücreye bölünmüştü). Kimlik uuid değilse VE stok hücresi sayı değilse bu
  // satır veri olamaz; "stok değeri sayı değil" diye hata vermek kullanıcıyı
  // olmayan bir soruna baktırırdı.
  const rawQuantity = fields[5] !== undefined ? fields[5] : fields[fields.length - 1];
  return parseQuantity(rawQuantity ?? '') === null;
}
