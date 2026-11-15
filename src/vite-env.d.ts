/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  /** Publishable anahtar (`sb_publishable_…`). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_ALLOW_TENANT_OVERRIDE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
