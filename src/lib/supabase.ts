import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.generated';

const url = import.meta.env.VITE_SUPABASE_URL;

/**
 * Publishable anahtar (`sb_publishable_…`) tercih edilir; yoksa legacy `anon`
 * anahtarına düşülür.
 *
 * NEDEN GEÇİŞ: legacy `anon`/`service_role` anahtarları JWT secret'tan türer.
 * Biri sızarsa tek çözüm secret'ı döndürmektir ve bu, frontend redeploy
 * edilene kadar siteyi KOMPLE düşürür. Yeni anahtarlar tek tek iptal edilir.
 *
 * NEDEN FALLBACK: Vercel'deki ortam değişkeni elle eklenir. Fallback olmasaydı
 * bu commit yayına çıktığı an, değişken eklenene kadar prod kırılırdı.
 * Değişken her yerde tanımlandıktan sonra bu dal silinir (kilitli kural 15'in
 * mantığı: geçiş sırasında iki dünya da çalışmalı).
 */
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    'VITE_SUPABASE_URL ve VITE_SUPABASE_PUBLISHABLE_KEY tanımlı değil. ' +
      '.env.example dosyasını .env.local olarak kopyala.',
  );
}

// Secret/service role anahtarı burada ASLA kullanılmaz — yalnızca Edge Function
// ortamında. Frontend bundle'ına girerse RLS tümüyle bypass edilebilirdi.
export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
