/**
 * WhatsApp derin linki — SMS/servis yok, sunucuya hiç dokunulmaz.
 *
 * Mesaj kullanıcının WhatsApp'ında ÖNCEDEN DOLDURULMUŞ olarak açılır; gönderme
 * kararı her zaman kullanıcınındır.
 */

/** Yalnız rakamları bırakır (E.164'e yakın sadeleştirme). */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function buildWhatsAppLink(params: { phone?: string | undefined; message: string }): string {
  const text = encodeURIComponent(params.message);
  const phone = params.phone ? normalizePhone(params.phone) : '';
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}
