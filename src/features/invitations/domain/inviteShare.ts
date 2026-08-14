/** Davetin WhatsApp ile paylaşılması — SAF (A20). */

import { inviteUrl } from './invitation';

export interface InviteShareInput {
  /** Daveti gönderen firmanın adı. */
  inviterName: string;
  /** Davet edilenin giriş kodu — VKN ile aynıdır (kilitli kural 18). */
  userCode: string;
  /** Misafir girişinde istenen sponsor numarası: davet edenin VKN'si. */
  sponsorVkn: string;
  /** Davet eden tarafından belirlenen ilk şifre. */
  password: string;
  token: string;
  origin: string;
}

/**
 * Telefonu WhatsApp'ın beklediği biçime çevirir.
 *
 * `wa.me` yalnız rakam kabul eder ve ülke kodu ister. Türkiye numaraları
 * kullanıcı tarafından "0532...", "532..." ya da "90532..." diye yazılıyor;
 * üçü de aynı numaradır ve üçü de çalışmalı.
 */
export function toWhatsappNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `90${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `90${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('90')) return digits;
  return digits.length >= 11 ? digits : null;
}

/** WhatsApp mesajı — giriş bilgileri ve bağlantı birlikte gider. */
export function buildInviteMessage(input: InviteShareInput): string {
  return [
    `${input.inviterName} sizi KÖPRÜ'ye ekledi.`,
    '',
    'Giriş bilgileriniz (MİSAFİR sekmesi):',
    `Sizi ekleyenin vergi no: ${input.sponsorVkn}`,
    `Kullanıcı kodunuz: ${input.userCode}`,
    `Şifreniz: ${input.password}`,
    '',
    'Bilgileriniz ve giriş bağlantısı:',
    inviteUrl(input.token, input.origin),
  ].join('\n');
}

/**
 * Paylaşım bağlantısı. Numara okunamazsa `null` döner ve çağıran WhatsApp'ı
 * hiç açmaz — boş bir sohbet açmak kullanıcıyı yanıltırdı.
 */
export function whatsappShareUrl(phone: string, message: string): string | null {
  const number = toWhatsappNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
