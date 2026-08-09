/**
 * RPC argümanlarından `undefined` değerli anahtarları KALDIRIR.
 *
 * NEDEN GEREKLİ: projede `exactOptionalPropertyTypes` açık. Bu ayarla
 * "anahtar hiç yok" ile "anahtar var ama değeri undefined" farklı şeylerdir.
 * Supabase'in ürettiği RPC tipleri isteğe bağlı parametreleri `p_x?: string`
 * diye yazar — yani `p_x: undefined` geçmek tip hatasıdır, oysa niyetimiz
 * "bu argümanı hiç gönderme"dir.
 *
 * Çalışma anındaki karşılığı da tam olarak budur: anahtar silindiğinde
 * PostgREST argümanı atlar ve fonksiyon kendi SQL varsayılanını kullanır.
 *
 * Tip düzeyinde ZORUNLU alanlar zorunlu kalır; yalnız `undefined` alabilenler
 * isteğe bağlıya çevrilir. Böylece eksik bir zorunlu argüman hâlâ hata verir.
 */
export type WithoutUndefined<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
};

export function rpcArgs<T extends Record<string, unknown>>(args: T): WithoutUndefined<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined) out[key] = value;
  }
  return out as WithoutUndefined<T>;
}
