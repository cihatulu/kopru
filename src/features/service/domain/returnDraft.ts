/** İade talebi taslağının kuralları — SAF (A20). */

export interface ReturnLine {
  orderItemId: string;
  quantity: number;
}

/** Miktar 0 ile sipariş edilen adet arasına sıkıştırılır; arayüz sınırı aşamaz. */
export function clampReturnQty(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(Math.trunc(value), max));
}

/** Sıfır adetli satırlar gönderilmez. */
export function toReturnLines(quantities: Record<string, number>): ReturnLine[] {
  return Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));
}

/** İlk hatayı döndürür; taslak geçerliyse null. */
export function validateReturnDraft(lines: ReturnLine[], reason: string): string | null {
  if (lines.length === 0) return 'Lütfen iade edilecek en az bir ürün miktarı seçiniz.';
  if (!reason.trim()) return 'Lütfen iade nedenini belirtiniz.';
  return null;
}
