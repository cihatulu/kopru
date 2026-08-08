/** Set (takım) oluşturma hesapları — SAF (A20). */

export interface SetLineInput {
  productId: string;
  name: string;
  unitPrice: number;
  unitCost: number | undefined;
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

/** Otomatik açıklama: "2 × Alanya Köşe Koltuk, 1 × Havana Sehpa". */
export function describeSet(lines: SetLineInput[]): string {
  return lines
    .filter((l) => l.quantity > 0)
    .map((l) => `${l.quantity} × ${l.name}`)
    .join(', ');
}

/** Miktar 1'in altına inemez; sıfır kalem takımdan çıkarmak demektir. */
export function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.floor(value));
}
