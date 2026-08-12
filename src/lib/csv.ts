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

  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
