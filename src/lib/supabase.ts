import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.generated';

const url = import.meta.env.VITE_SUPABASE_URL;

/**
 * Yalnız publishable anahtar (`sb_publishable_…`) kullanılır.
 *
 * NEDEN: legacy `anon`/`service_role` anahtarları JWT secret'tan türer.
 * Biri sızarsa tek çözüm secret'ı döndürmektir ve bu, frontend redeploy
 * edilene kadar siteyi KOMPLE düşürür. Yeni anahtarlar tek tek iptal edilir.
 * Legacy `anon` anahtarına geri dönüş dalı geçiş tamamlanınca kaldırıldı.
 */
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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
