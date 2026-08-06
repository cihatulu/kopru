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

/** T.C. Kimlik No — 11 hane, ilk hane 0 olamaz, iki basamaklı checksum. */
export function isValidTckn(value: string): boolean {
  if (!/^[1-9][0-9]{10}$/.test(value)) return false;

  const d = [...value].map(Number);

  // 1., 3., 5., 7., 9. haneler (0-indeksli: 0,2,4,6,8)
  const odd = d[0]! + d[2]! + d[4]! + d[6]! + d[8]!;
  // 2., 4., 6., 8. haneler
  const even = d[1]! + d[3]! + d[5]! + d[7]!;

  if ((odd * 7 - even) % 10 !== d[9]) return false;

  const firstTen = d.slice(0, 10).reduce((a, b) => a + b, 0);
  return firstTen % 10 === d[10];
}

/** Vergi Kimlik No — 10 hane, ağırlıklı mod-9 checksum. */
export function isValidVkn(value: string): boolean {
  if (!/^[0-9]{10}$/.test(value)) return false;

  const d = [...value].map(Number);
  let total = 0;

  for (let i = 0; i < 9; i++) {
    const tmp = (d[i]! + (9 - i)) % 10;
    // tmp === 9 özel durumu: 2^k ile çarpım mod 9 sıfırlanacağı için doğrudan eklenir.
    total += tmp === 9 ? tmp : (tmp * 2 ** (9 - i)) % 9;
  }

  return (10 - (total % 10)) % 10 === d[9];
}

/** Kullanıcı kodu olarak kabul edilen tek biçim: geçerli VKN veya geçerli TCKN. */
export function isValidVknTc(value: string): boolean {
  return isValidVkn(value) || isValidTckn(value);
}

/** Giriş formu ve API sınırında normalize: boşluk/tire ayıklanır. */
export function normalizeVknTc(value: string): string {
  return value.replace(/[\s.-]/g, '');
}
