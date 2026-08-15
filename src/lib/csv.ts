/**
 * CSV indirme.
 *
 * Ayraç NOKTALI VİRGÜL ve başta BOM var: Excel'in Türkçe yerel ayarı virgülü
 * ondalık ayracı sayar, BOM olmadan da Türkçe karakterler bozuk görünür.
 */
const BOM = '﻿';

export function downloadCSV(
  headers: string[],
  rows: (string | number)[][],
  fileName: string,
): void {
  const escape = (cell: string | number) => `"${String(cell).replace(/"/g, '""')}"`;
  const content = [headers.join(';'), ...rows.map((r) => r.map(escape).join(';'))].join('\r\n');
  downloadCsvText(content, fileName);
}

/**
 * Hazır bir dosyayı indirtir.
 *
 * `Promise<Blob>` alır: xlsx üreticisi kütüphaneyi dinamik yüklediği için
 * asenkrondur ve çağrı yerinin `await` ile uğraşmasına gerek kalmaz.
 */
export async function downloadBlob(blob: Blob | Promise<Blob>, fileName: string): Promise<void> {
  const url = URL.createObjectURL(await blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Hazır CSV metnini indirtir.
 *
 * Metni kendi üreten çağıranlar için (ör. stok şablonu). BOM ve mime tipi
 * burada tek yerde verilir; her sayfanın kendi `Blob` + `<a>` kopyasını
 * taşıması Türkçe karakter hatasının tekrar tekrar geri gelmesi demekti.
 */
export function downloadCsvText(content: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
