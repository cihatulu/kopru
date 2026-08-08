/**
 * Davet akışının hata kodları → kullanıcı mesajı. SAF (A20).
 *
 * `login` akışının tersine burada ÖZEL mesajlar verilir. Sebep: davet linkini
 * elinde tutan taraf zaten meşru; ona "bir şeyler ters gitti" demek, kayıt
 * formunu tamamlamasını imkânsız kılar. Sızacak bir bilgi de yoktur — token
 * olmadan hiçbir yanıt alınamaz.
 */
export const INVITE_ERROR_MESSAGES: Record<string, string> = {
  INVITATION_NOT_FOUND: 'Bu davet linki geçersiz. Sizi davet eden firmadan yeni link isteyin.',
  ALREADY_USED: 'Bu davet daha önce kullanılmış. Giriş ekranından oturum açabilirsiniz.',
  REVOKED: 'Bu davet iptal edilmiş. Sizi davet eden firmayla iletişime geçin.',
  EXPIRED: 'Bu davetin süresi dolmuş. Sizi davet eden firmadan yeni link isteyin.',
  VKN_MISMATCH: 'Bu davet başka bir vergi numarası için oluşturulmuş.',
  KIND_MISMATCH: 'Bu vergi numarası sistemde farklı bir firma tipiyle kayıtlı.',
  SELF_REFERENCE: 'Sizi davet eden firmanın numarasını kullanamazsınız.',
  INVALID_VKN: 'Geçerli bir VKN veya T.C. Kimlik No girin.',
  INVALID_COMPANY_NAME: 'Firma adı en az 2 karakter olmalı.',
  WEAK_PASSWORD: 'Şifre en az 8 karakter olmalı ve bir harf ile bir rakam içermeli.',
  DEFAULT: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
};

/** Link artık kullanılamaz — form gösterilmez, yalnız açıklama gösterilir. */
export function isTerminalInviteError(code: string): boolean {
  return ['INVITATION_NOT_FOUND', 'ALREADY_USED', 'REVOKED', 'EXPIRED'].includes(code);
}
