/** Cari hesap ekranının bakış açısı mantığı — SAF (A20). */

export interface AccountRow {
  relationshipId: string;
  counterpartyOrgId: string;
  companyName: string;
  vknTc: string;
  /** Sipariş/masraf toplamı — perakendecinin borçlandığı tutar. */
  totalDebit: number;
  /** Tahsilat toplamı. */
  totalCredit: number;
  /** Son satırdaki `balance_after`. Pozitif = perakendeci borçlu. */
  balance: number;
  /**
   * Karşı taraf abone mu?
   * true  → kayıt karşı tarafın onayı olmadan işlenmez.
   * false → karşı taraf misafir; kaydı doğrudan transactions'a yazılır.
   */
  counterpartyIsSubscriber: boolean;
}

/**
 * Bakiyenin ETİKETİ, kime baktığına göre değişir.
 *
 * `balance_after` her zaman "perakendeci ne kadar borçlu" demektir. Aynı sayı
 * üretici için ALACAK, perakendeci için BORÇtur. Tek bir etiket kullanmak
 * taraflardan birine sürekli ters okunurdu.
 */
export type BalanceSide = 'receivable' | 'payable' | 'settled';

export function balanceSide(balance: number, isManufacturer: boolean): BalanceSide {
  if (Math.abs(balance) < 0.005) return 'settled';
  const owedToMe = isManufacturer ? balance > 0 : balance < 0;
  return owedToMe ? 'receivable' : 'payable';
}

export const BALANCE_LABEL: Record<BalanceSide, string> = {
  receivable: 'ALACAKLI',
  payable: 'BORÇLU',
  settled: 'BAKİYE SIFIR',
};

/** Kısa gösterim: "₺180.000 (A)" / "(B)". */
export function balanceSuffix(side: BalanceSide): string {
  if (side === 'receivable') return '(A)';
  if (side === 'payable') return '(B)';
  return '';
}

/**
 * Sütun başlıkları da bakış açısına göre değişir.
 *
 * Üretici için sipariş bir SATIŞTIR (alacak doğurur), tahsilat ise borcu
 * kapatır. Perakendeci için tam tersi.
 */
export function columnLabels(isManufacturer: boolean): { debit: string; credit: string } {
  return isManufacturer
    ? { debit: 'Borç (Tahsilatlar)', credit: 'Alacak (Satışlar)' }
    : { debit: 'Borç (Alışlar)', credit: 'Alacak (Ödemeler)' };
}

/** Elle işlem tipi seçenekleri — metinler tarafa göre değişir. */
export function manualEntryOptions(
  isManufacturer: boolean,
): { value: 'credit' | 'debit'; label: string }[] {
  return isManufacturer
    ? [
        { value: 'credit', label: 'Tahsilat / Ödeme Alındı' },
        { value: 'debit', label: 'Ek Gider (perakendeciye yansıtılan)' },
      ]
    : [
        { value: 'credit', label: 'Ödeme Yaptım' },
        { value: 'debit', label: 'Ek Masraf (bana yansıtılan)' },
      ];
}

/**
 * Ekstre içinde arama — sipariş numarası veya açıklama.
 *
 * Yalnız YÜKLENMİŞ satırlarda arar; sayfalama sunucu tarafındadır. Bu yüzden
 * çağıran taraf, sonuç boşken "daha fazla yükle" seçeneğini gizlememelidir.
 */
export function filterEntries<T extends { description: string }>(
  entries: T[],
  search: string,
): T[] {
  const term = search.trim().toLocaleLowerCase('tr');
  if (!term) return entries;
  return entries.filter((e) => e.description.toLocaleLowerCase('tr').includes(term));
}

/** Firma adına göre arama — liste sunucuda değil, elde süzülür. */
export function filterAccounts(rows: AccountRow[], search: string): AccountRow[] {
  const term = search.trim().toLocaleLowerCase('tr');
  if (!term) return rows;
  return rows.filter(
    (r) =>
      r.companyName.toLocaleLowerCase('tr').includes(term) || r.vknTc.includes(term),
  );
}
