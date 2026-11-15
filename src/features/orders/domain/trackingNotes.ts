/**
 * Müşteriye açık takip sayfasında gösterilecek notların süzülmesi — SAF (A20).
 *
 * Takip bağlantısı müşteriye gider; iç yazışma, iade tutarı veya toptan
 * maliyet içeren notlar burada elenir (A4: üretici fiyatı müşteriye sızmaz).
 */

export function normalizeTr(s: string): string {
  return s
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .toLowerCase();
}

export function cleanPublicNote(note: string | null | undefined): string | null {
  if (!note) return null;
  const trimmed = note.trim();
  const lower = normalizeTr(trimmed);

  // İade onay/red/tutar notlarını gizle (yukarıdaki iade tablosu zaten tüm perakende detayını gösterir)
  if (lower.includes('iade onay') || lower.includes('iade redded') || lower.includes('iade')) {
    return null;
  }

  // Müşteri teslimat notları Faz 1 B2B sevkiyat geçmişine karışmamalı, en alttaki Faz 2 kartında gösterilmeli
  if (lower.includes('teslimat planland') || lower.includes('musteri teslimat')) {
    return null;
  }

  // "105000", "140000.00 TL", "50000" gibi sadece rakam veya ham tutar içeren toptan maliyet notlarını gizle
  if (/^\d+([.,]\d+)?(\s*(tl|₺|lira))?$/i.test(trimmed)) {
    return null;
  }

  // İç yazışma veya toptan maliyet sızmasını engelle
  if (/\b(maliyet|toptan|alis fiyati|tedarik fiyati)\b/i.test(lower)) {
    return null;
  }

  return trimmed;
}
