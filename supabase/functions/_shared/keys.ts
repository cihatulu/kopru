/**
 * API anahtarlarını ortamdan okur — legacy ve yeni biçimin ikisini de bilir.
 *
 * NEDEN: Supabase, JWT tabanlı `anon`/`service_role` anahtarlarını emekliye
 * ayırıyor. Yenileri (`sb_publishable_…` / `sb_secret_…`) tek tek oluşturulup
 * iptal edilebilir; legacy anahtarları döndürmek JWT secret'ı döndürmek demek
 * ve bu, siteyi redeploy edene kadar KOMPLE düşürür.
 *
 * Yeni değişkenler düz metin DEĞİL, ada göre anahtarlanmış JSON tutar:
 *   SUPABASE_SECRET_KEYS      = {"default":"sb_secret_…"}
 *   SUPABASE_PUBLISHABLE_KEYS = {"default":"sb_publishable_…"}
 *
 * Geçiş bitene kadar legacy değişkene düşülür; böylece fonksiyonlar iki
 * dünyada da çalışır ve deploy sırası önem taşımaz.
 */

function fromJson(varName: string, keyName = 'default'): string | null {
  const raw = Deno.env.get(varName);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed[keyName] ?? null;
  } catch {
    // Bozuk JSON sessizce yutulmaz ama fonksiyonu da düşürmez: legacy'ye düşer.
    console.error(`${varName} JSON olarak okunamadı`);
    return null;
  }
}

/** RLS'i BYPASS eden anahtar. Yalnız sunucuda; yetki kontrolü elle yapılır. */
export function secretKey(): string {
  const key = fromJson('SUPABASE_SECRET_KEYS') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key) throw new Error('Secret key yok: SUPABASE_SECRET_KEYS/SERVICE_ROLE_KEY tanımsız');
  return key;
}

/** RLS'e TABİ anahtar. Çağıranın kimliğini doğrulamak için kullanılır. */
export function publishableKey(): string {
  const key = fromJson('SUPABASE_PUBLISHABLE_KEYS') ?? Deno.env.get('SUPABASE_ANON_KEY');
  if (!key) throw new Error('Publishable key yok: SUPABASE_PUBLISHABLE_KEYS/ANON_KEY tanımsız');
  return key;
}

export function projectUrl(): string {
  const url = Deno.env.get('SUPABASE_URL');
  if (!url) throw new Error('SUPABASE_URL tanımsız');
  return url;
}
