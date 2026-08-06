import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.generated';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlı değil. .env.example dosyasını .env.local olarak kopyala.',
  );
}

// Service role anahtarı burada ASLA kullanılmaz — yalnızca Edge Function ortamında.
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
