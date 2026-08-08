/**
 * Stok CSV'sinin ayrıştırılması ve üretilmesi — SAF (A20).
 *
 * Bu dosya Türkçe Excel gerçeğine göre yazıldı: kullanıcı dosyayı Excel'de
 * açıp kaydettiğinde ayraç `;` olur, ondalık ayıracı `,` olur ve dosyanın
 * başına BOM eklenir. Bunların hiçbiri varsayılan CSV kabullerine uymaz;
 * hesaba katılmazsa içe aktarma sessizce sıfır satır işler.
 */
import { parseDecimal } from '@/lib/format';

export interface StockCsvRow {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
}

export interface ParsedCsv {
  rows: StockCsvRow[];
  /** Ayrıştırılamayan satırlar — kullanıcıya gösterilir, sessizce yutulmaz. */
  errors: { line: number; reason: string }[];
}

export const CSV_HEADERS = ['urun_id', 'urun_kodu', 'urun_adi', 'stok'] as const;

/** Excel'in Türkçe yerelinde beklediği ayraç. */
const SEPARATOR = ';';

/**
 * UTF-8 bayt sırası imi.
 *
 * Kaçış dizisiyle yazılır, kaynağa gömülmez: görünmez bir karakter olarak
 * dosyada durursa hem lint takılır hem de sonradan okuyan biri onu yanlışlıkla
 * siler.
 */
const BOM = '\uFEFF';

/** Excel bir alanı ancak tırnaklanmışsa metin sayar; ayraç içeren adlar bozulmasın. */
function quote(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * İndirilecek şablon.
 *
 * BOM ZORUNLU: Excel BOM'suz UTF-8'i sistem kod sayfası sanar ve Türkçe
 * karakterler bozulur ("Gardırop" → "GardÄ±rop").
 */
export function toCsv(rows: StockCsvRow[]): string {
  const lines = [CSV_HEADERS.join(SEPARATOR)];
  for (const r of rows) {
    lines.push(
      [
        quote(r.productId),
        quote(r.productCode),
        quote(r.productName),
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

/**
 * Ayracı ilk satırdan tahmin eder.
 *
 * Dosya bizim şablonumuzdan gelmiş olsa bile kullanıcı onu başka bir araçla
 * kaydetmiş olabilir; ayracı sabit varsaymak tüm satırı tek alan yapar.
 */
function detectSeparator(headerLine: string): string {
  const counts: [string, number][] = [';', ',', '\t'].map((s) => [
    s,
    headerLine.split(s).length - 1,
  ]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0]![1] > 0 ? counts[0]![0] : SEPARATOR;
}

/**
 * Miktarı okur.
 *
 * "1.234,5" (Türkçe) ve "1234.5" (İngilizce) biçimlerinin ikisi de gelir.
 * Ayrım kurala bağlanır: son ayraç hangisiyse ondalık ayıracı odur; diğeri
 * binlik ayıracıdır ve atılır.
 */
export function parseQuantity(raw: string): number | null {
  const n = parseDecimal(raw);
  // Negatif stok anlamlı değil; ayrıştırma ortak, kısıt buraya ait.
  if (n === null || n < 0) return null;
  return n;
}

/** Başlık satırını tanır — kullanıcı sütunları yeniden adlandırmış olabilir. */
function isHeader(fields: string[]): boolean {
  const first = (fields[0] ?? '').trim().toLowerCase();
  return first === 'urun_id' || first === 'ürün_id' || first === 'id';
}

export function parseCsv(text: string): ParsedCsv {
  // BOM'u at: kalırsa ilk alan BOM+"urun_id" olur ve başlık tanınmaz.
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
    const quantity = parseQuantity(fields[3] ?? '');

    if (!productId) {
      errors.push({ line: i + 1, reason: 'Ürün kimliği boş' });
      continue;
    }
    if (quantity === null) {
      errors.push({ line: i + 1, reason: 'Stok değeri sayı değil veya negatif' });
      continue;
    }

    rows.push({
      productId,
      productCode: fields[1] ?? '',
      productName: fields[2] ?? '',
      quantity,
    });
  }

  return { rows, errors };
}
