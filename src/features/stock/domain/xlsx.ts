/**
 * Excel (.xlsx) okuma ve yazma — SAF (A20).
 *
 * NEDEN XLSX: ekran baştan beri "Excel şablonu" vaat ediyordu ama yalnız CSV
 * kabul ediyorduk. Kullanıcı şablonu Excel'de açıp .xlsx olarak kaydettiğinde
 * dosya ikili (ZIP) olduğu için metin sanılıyor ve "stok değeri sayı değil"
 * gibi ALAKASIZ bir hata veriyordu. CSV'nin üç klasik derdi de burada biter:
 * ayraç tahmini, Türkçe karakter bozulması ve kimlik sütununun sayıya
 * çevrilmesi.
 *
 * Kütüphaneler DİNAMİK yüklenir: stok ekranına girmeyen kullanıcı bu ~200 KB'ı
 * indirmez.
 */
import type { ParsedCsv, StockCsvRow } from './csv';
import { CSV_HEADERS } from './csv';
import { isHeaderRow, toStockRow } from './sheetRow';

/** ZIP imzası — xlsx bir ZIP arşividir, CSV değildir. */
export function looksLikeXlsx(head: Uint8Array): boolean {
  return head[0] === 0x50 && head[1] === 0x4b; // "PK"
}

/** Hücreyi metne çevirir; `null` ve tarih gibi tipler güvenle düzleşir. */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export async function parseXlsx(input: ArrayBuffer | Blob): Promise<ParsedCsv> {
  const { readSheet } = await import('read-excel-file/browser');
  const sheet = await readSheet(input);

  const rows: StockCsvRow[] = [];
  const errors: { line: number; reason: string }[] = [];

  for (let i = 0; i < sheet.length; i++) {
    const fields = (sheet[i] ?? []).map(cellText);

    // Excel dosyanın sonuna tümüyle boş satırlar bırakabilir; bunlar hata değil.
    if (fields.every((f) => f === '')) continue;
    if (i === 0 && isHeaderRow(fields)) continue;

    const result = toStockRow(fields, i + 1);
    if (result.ok) rows.push(result.row);
    else errors.push(result.error);
  }

  return { rows, errors };
}

/**
 * İndirilecek şablon.
 *
 * Kimlik sütunu METİN olarak yazılır — Excel uzun onaltılık dizeleri sayıya
 * çevirip bilimsel gösterime düşürebilir ve kimlik sessizce bozulur.
 */
export async function toXlsxBlob(rows: readonly StockCsvRow[]): Promise<Blob> {
  const writeXlsxFile = (await import('write-excel-file/browser')).default;

  const header = CSV_HEADERS.map((value) => ({ value, fontWeight: 'bold' as const }));
  const body = rows.map((r) => [
    { value: r.productId, type: String },
    { value: r.productName, type: String },
    { value: r.productCode, type: String },
    { value: r.category ?? '', type: String },
    { value: r.groupName ?? '', type: String },
    { value: r.quantity, type: Number },
  ]);

  return writeXlsxFile([header, ...body], {
    columns: [{ width: 40 }, { width: 32 }, { width: 16 }, { width: 18 }, { width: 22 }, { width: 14 }],
  }).toBlob();
}
