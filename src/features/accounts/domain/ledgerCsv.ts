/**
 * Cari ekstrenin CSV'ye dökümü — SAF (A20).
 *
 * Stok CSV'siyle aynı Türkçe Excel gerçeği geçerli: `;` ayraç, `,` ondalık,
 * BOM. Buradaki fark, dosyanın muhasebeye gitmesi — sayıların Excel'de METİN
 * değil SAYI olarak açılması şart, yoksa kimse toplam alamaz.
 */
import type { LedgerEntry } from '../api/useAccounts';
import type { LedgerSummary } from './period';

const SEPARATOR = ';';
const BOM = '\uFEFF';

export const LEDGER_HEADERS = [
  'tarih',
  'tur',
  'aciklama',
  'borc',
  'alacak',
  'bakiye',
] as const;

function quote(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Excel'in Türkçe yerelinde sayı: ondalık virgül, binlik ayıracı YOK. */
function money(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function stamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Ekstreyi CSV'ye çevirir.
 *
 * Satırlar ESKİDEN YENİYE yazılır — ekranda tersi gösterilir ama bir ekstre
 * yukarıdan aşağıya okunur ve `bakiye` sütunu ancak bu sırada anlamlıdır.
 */
export function ledgerToCsv(
  entries: LedgerEntry[],
  summary: LedgerSummary | null,
  counterpartyName: string,
): string {
  const lines: string[] = [];

  if (summary) {
    // Özet başlığı: dosyayı açan kişi hangi dönemi elinde tuttuğunu bilmeli.
    lines.push([quote('Cari Ekstre'), quote(counterpartyName)].join(SEPARATOR));
    lines.push([quote('Devir bakiye'), money(summary.openingBalance)].join(SEPARATOR));
    lines.push([quote('Toplam borç'), money(summary.totalDebit)].join(SEPARATOR));
    lines.push([quote('Toplam alacak'), money(summary.totalCredit)].join(SEPARATOR));
    lines.push([quote('Kapanış bakiye'), money(summary.closingBalance)].join(SEPARATOR));
    lines.push('');
  }

  lines.push(LEDGER_HEADERS.join(SEPARATOR));

  const ascending = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const e of ascending) {
    lines.push(
      [
        quote(stamp(e.createdAt)),
        quote(e.type === 'debit' ? 'Borç' : 'Alacak'),
        quote(e.description),
        // Borç ve alacak AYRI sütunlarda: muhasebenin beklediği biçim budur.
        e.type === 'debit' ? money(e.amount) : '',
        e.type === 'credit' ? money(e.amount) : '',
        money(e.balanceAfter),
      ].join(SEPARATOR),
    );
  }

  return `${BOM}${lines.join('\r\n')}\r\n`;
}

/** Dosya adı: hangi firma, hangi tarih — indirilenler klasöründe kaybolmasın. */
export function ledgerFileName(counterpartyName: string, today: Date = new Date()): string {
  const slug = counterpartyName
    .toLocaleLowerCase('tr')
    .replace(/[^a-z0-9ğüşıöç]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `cari-${slug || 'ekstre'}-${today.toISOString().slice(0, 10)}.csv`;
}
