/**
 * Yakalanan hatadan okunabilir mesaj çıkarır.
 *
 * NEDEN GEREKLİ: supabase-js'in `PostgrestError`'ı düz bir nesnedir, `Error`
 * ALT SINIFI DEĞİLDİR. `err instanceof Error` kontrolü bu yüzden tutmaz ve
 * sunucunun asıl mesajı kaybolup yerine genel bir metin geçer — hatayı
 * görünür yapmak, yanlış mesajı göstermeye dönüşür.
 *
 * `details` ve `hint` de eklenir: RPC'lerin `raise exception` ile attığı kod
 * (ör. `PRODUCT_NOT_FOUND`) çoğu zaman yalnız bu alanlarda anlam kazanır.
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'string' && err.trim()) return err;

  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

    const parts = [text(e.message), text(e.details), text(e.hint)].filter(
      (p): p is string => p !== null,
    );
    const code = text(e.code);

    if (parts.length > 0) return code ? `${parts.join(' — ')} [${code}]` : parts.join(' — ');
    if (code) return `${fallback} [${code}]`;
  }

  return fallback;
}
