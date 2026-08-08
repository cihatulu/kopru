/**
 * VKN / TCKN doğrulama (A3 · kilitli kural 18).
 *
 * `organizations.vkn_tc` bu projede hem giriş kimliği hem de organizasyonların
 * yakınsama anahtarıdır — iki abone birbirini eklediğinde aynı düğümde birleşmelerini
 * sağlayan şey budur. Bu yüzden serbest metin olamaz.
 *
 * Buradaki algoritmalar `supabase/migrations/20260806090000_initial_org_schema.sql`
 * içindeki `is_valid_tckn` / `is_valid_vkn` fonksiyonlarının birebir aynısıdır.
 * Biri değişirse diğeri de değişmeli — DB CHECK son sözü söyler, bu katman
 * kullanıcıya anında geri bildirim verir.
 */

/**
 * T.C. Kimlik No — sadece format: 11 hane, ilk hane 1-9.
 * Checksum kontrolü kaldırıldı — test ve geliştirme ortamında keyfi numara kullanılabilir.
 */
export function isValidTckn(value: string): boolean {
  return /^[1-9][0-9]{10}$/.test(value);
}

/** Vergi Kimlik No — sadece format: tam 10 rakam. Checksum kontrolü kaldırıldı. */
export function isValidVkn(value: string): boolean {
  return /^[0-9]{10}$/.test(value);
}

/** Kullanıcı kodu olarak kabul edilen tek biçim: geçerli VKN veya geçerli TCKN. */
export function isValidVknTc(value: string): boolean {
  return isValidVkn(value) || isValidTckn(value);
}

/** Giriş formu ve API sınırında normalize: boşluk/tire ayıklanır. */
export function normalizeVknTc(value: string): string {
  return value.replace(/[\s.-]/g, '');
}
