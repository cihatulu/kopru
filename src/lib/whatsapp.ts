/**
 * WhatsApp derin linki — SMS/servis yok, sunucuya hiç dokunulmaz.
 *
 * Mesaj kullanıcının WhatsApp'ında ÖNCEDEN DOLDURULMUŞ olarak açılır; gönderme
 * kararı her zaman kullanıcınındır.
 */

/**
 * Telefon numarasını E.164 formatına dönüştürür.
 * Türkiye örneği: "0501 563 03 69" → "905015630369"
 *   - Önce tüm rakam-dışı karakterleri temizle
 *   - Başında 0 varsa ve uzunluk 10-11 haneyse Türkiye kodu (90) ekle
 */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');

  // Türkiye yerel formatı: "0501..." → "90501..."
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '9' + digits; // 0 → 90
  }

  return digits;
}

/** Masaüstü: web.whatsapp.com/send — ara ekran olmadan direkt sohbet açılır. */
export function buildWhatsAppLink(params: { phone?: string | undefined; message: string }): string {
  const text = encodeURIComponent(params.message);
  const phone = params.phone ? normalizePhone(params.phone) : '';
  return phone
    ? `https://web.whatsapp.com/send?phone=${phone}&text=${text}`
    : `https://web.whatsapp.com/send?text=${text}`;
}
