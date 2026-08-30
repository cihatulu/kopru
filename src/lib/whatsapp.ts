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

/**
 * Kullanıcının mobil cihazda olup olmadığını tespit eder.
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent ?? '',
    ) ||
    window.innerWidth < 768 ||
    'ontouchstart' in window
  );
}

/**
 * WhatsApp derin bağlantısı.
 *
 * - Mobilde: `api.whatsapp.com/send` (cihazdaki yerel WhatsApp uygulamasını doğrudan açar).
 * - Masaüstünde: `web.whatsapp.com/send` (tarayıcıda WhatsApp Web sohbetini doğrudan açar).
 */
export function buildWhatsAppLink(params: {
  phone?: string | undefined;
  message: string;
}): string {
  const text = encodeURIComponent(params.message);
  const phone = params.phone ? normalizePhone(params.phone) : '';

  if (isMobileDevice()) {
    return phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`;
  }

  return phone
    ? `https://web.whatsapp.com/send?phone=${phone}&text=${text}`
    : `https://web.whatsapp.com/send?text=${text}`;
}
