/**
 * Stok CSV'sinin ayrıştırılması ve üretilmesi — SAF (A20).
 *
 * Excel/CSV şablonu furniture-platform ile birebir uyumludur:
 * ['Ürün ID (DEĞİŞTİRMEYİN)', 'Ürün Adı', 'Model', 'Kategori', 'Grup Adı', 'Mevcut Stok']
 */
import { parseDecimal } from '@/lib/format';

export interface StockCsvRow {
  /**
   * BOŞ ise bu satır YENİ üründür — sunucu pasif olarak oluşturur.
   * Dolu ama bize ait değilse sunucu satırı atlar, ürün doğurmaz.
   */
  productId: string;
  productName: string;
  productCode: string;
  category: string | null;
  groupName: string | null;
  quantity: number;
}

export interface ParsedCsv {
  rows: StockCsvRow[];
  /** Ayrıştırılamayan satırlar — kullanıcıya gösterilir, sessizce yutulmaz. */
  errors: { line: number; reason: string }[];
}

export const CSV_HEADERS = [
  'Ürün ID (DEĞİŞTİRMEYİN)',
  'Ürün Adı',
  'Model',
  'Kategori',
  'Grup Adı',
  'Mevcut Stok',
] as const;

/** Excel'in Türkçe yerelinde beklediği ayraç. */
const SEPARATOR = ';';

/** UTF-8 bayt sırası imi. */
const BOM = '\uFEFF';

function quote(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * İndirilecek şablon.
 *
 * BOM ZORUNLU: Excel BOM'suz UTF-8'i sistem kod sayfası sanar ve Türkçe
 * karakterler bozulur.
 */
export function toCsv(rows: StockCsvRow[]): string {
  const lines = [CSV_HEADERS.join(SEPARATOR)];
  for (const r of rows) {
    lines.push(
      [
        quote(r.productId),
        quote(r.productName),
        quote(r.productCode),
        quote(r.category ?? ''),
        quote(r.groupName ?? ''),
        // Ondalık ayıracı virgül: Excel'in Türkçe yerelinde sayı böyle okunur.
        String(r.quantity).replace('.', ','),
      ].join(SEPARATOR),
    );
  }
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

/** Tırnakları ve kaçışları çözerek tek satırı alanlara böler. */
function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === sep) {
      out.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out;
}

/** Ayracı tahmin eder. */
function detectSeparator(headerLine: string): string {
  const counts: [string, number][] = [';', ',', '\t'].map((s) => [
    s,
    headerLine.split(s).length - 1,
  ]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0]![1] > 0 ? counts[0]![0] : SEPARATOR;
}

/** Miktarı okur. */
export function parseQuantity(raw: string): number | null {
  const n = parseDecimal(raw);
  if (n === null || n < 0) return null;
  return n;
}

/** Başlık satırını tanır. */
function isHeader(fields: string[]): boolean {
  const first = (fields[0] ?? '').trim().toLowerCase();
  return (
    first.includes('ürün id') ||
    first.includes('urun id') ||
    first.includes('id') ||
    first === 'ürün id (değiştirmeyin)'
  );
}

export function parseCsv(text: string): ParsedCsv {
  const clean = text.startsWith(BOM) ? text.slice(BOM.length) : text;
  const lines = clean.split(/\r\n|\n|\r/).filter((l) => l.trim() !== '');

  const rows: StockCsvRow[] = [];
  const errors: { line: number; reason: string }[] = [];
  if (lines.length === 0) return { rows, errors };

  const sep = detectSeparator(lines[0]!);
  const start = isHeader(splitLine(lines[0]!, sep)) ? 1 : 0;

  for (let i = start; i < lines.length; i++) {
    const fields = splitLine(lines[i]!, sep).map((f) => f.trim());
    const productId = fields[0] ?? '';
    // Mevcut stok son kolondadır (index 5 veya son eleman)
    const rawQuantity = fields[5] !== undefined ? fields[5] : fields[fields.length - 1];
    const quantity = parseQuantity(rawQuantity ?? '');

    const productName = (fields[1] ?? '').trim();

    // Kimliği olmayan satır artık hata değil: adı varsa YENİ ürün demektir.
    // İkisi de boşsa satırdan hiçbir şey anlaşılmaz.
    if (!productId && !productName) {
      errors.push({ line: i + 1, reason: 'Ürün kimliği ve adı boş' });
      continue;
    }
    if (quantity === null) {
      errors.push({ line: i + 1, reason: 'Stok değeri sayı değil veya negatif' });
      continue;
    }

    rows.push({
      productId,
      productName,
      productCode: fields[2] ?? '',
      category: fields[3] || null,
      groupName: fields[4] || null,
      quantity,
    });
  }

  return { rows, errors };
}
