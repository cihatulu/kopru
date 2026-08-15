/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  /** Yeni biçim (`sb_publishable_…`) — tercih edilen anahtar. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Legacy `anon` anahtarı. Geçiş bitince kaldırılacak. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ALLOW_TENANT_OVERRIDE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
