/** Set (takım) oluşturma hesapları — SAF (A20). */

export interface SetLineInput {
  productId: string;
  name: string;
  unitPrice: number;
  unitCost: number | undefined;
  /** Ürünün kendi açıklaması — takım açıklaması bunlardan derlenir. */
  description?: string | null;
  quantity: number;
}

/**
 * Takımın önerilen fiyatı: içindekilerin toplamı.
 *
 * Kullanıcı bunu değiştirebilir (takıma indirim uygulamak olağandır) ama
 * başlangıç değeri toplam olmalı — boş bir fiyat kutusu, kullanıcıyı elle
 * toplama yapmaya zorlar ve hata kaynağıdır.
 */
export function suggestedPrice(lines: SetLineInput[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
}

/**
 * Takımın maliyeti.
 *
 * İçindekilerden BİRİNİN bile maliyeti bilinmiyorsa toplam da bilinmiyordur —
 * eksik toplamı "maliyet" diye sunmak, marjı olduğundan yüksek gösterirdi.
 */
export function suggestedCost(lines: SetLineInput[]): number | null {
  let total = 0;
  for (const l of lines) {
    if (l.unitCost === undefined) return null;
    total += l.unitCost * l.quantity;
  }
  return total;
}

/** Takımın kurulabilmesi için en az iki kalem gerekir. */
export function canBuildSet(lines: SetLineInput[]): boolean {
  return lines.filter((l) => l.quantity > 0).length >= 2;
}

/** Takımın içeriği: "2 × Alanya Köşe Koltuk, 1 × Havana Sehpa". */
export function describeSet(lines: SetLineInput[]): string {
  return lines
    .filter((l) => l.quantity > 0)
    .map((l) => `${l.quantity} × ${l.name}`)
    .join(', ');
}

/**
 * Takımın tam açıklaması: içerik listesi + her ürünün KENDİ açıklaması.
 *
 * Yalnız "1 × Koltuk, 1 × Berjer" yazmak perakendeciye hiçbir şey anlatmıyor;
 * takımın içindeki ürünlerin malzeme ve ölçü bilgileri de gelmeli. Kullanıcı
 * metni yine düzenleyebilir — bu bir başlangıç noktasıdır.
 */
export function composeSetDescription(lines: SetLineInput[]): string {
  const included = lines.filter((l) => l.quantity > 0);
  if (included.length === 0) return '';

  const header = describeSet(included);
  const details = included
    .filter((l) => (l.description ?? '').trim() !== '')
    .map((l) => `${l.name}: ${(l.description ?? '').trim()}`);

  return details.length > 0 ? `${header}\n\n${details.join('\n\n')}` : header;
}

/** Miktar 1'in altına inemez; sıfır kalem takımdan çıkarmak demektir. */
export function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.floor(value));
}
