/**
 * Edge Function hatalarının okunması.
 *
 * supabase-js `error` alanını `any` olarak tipler; her çağrı yerinde ayrı ayrı
 * daraltmak yerine tek kapı burası. Gövde 4xx yanıtın içinde gelir ve
 * okunamayabilir (ağ kesildi, gövde boş) — o durumda genel kod döner.
 */

export interface EdgeError {
  context?: Response;
}

export interface EdgeResult<T> {
  data: T | null;
  error: EdgeError | null;
}

/** Yanıt gövdesindeki `error` kodunu okur; okunamazsa `fallback`. */
export async function edgeErrorCode(
  error: EdgeError | null,
  fallback = 'DEFAULT',
): Promise<string> {
  try {
    const body = (await error?.context?.json()) as { error?: string } | undefined;
    return body?.error ?? fallback;
  } catch {
    return fallback;
  }
}
