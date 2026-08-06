/**
 * GEÇİCİ YER TUTUCU — gerçek tipler `npm run gen:types` ile üretilir (kilitli kural 13).
 *
 * Supabase projesi bağlanana kadar burada gevşek bir şema durur ki sorgular
 * derlensin. Bağlantı kurulur kurulmaz:
 *
 *     npm run gen:types
 *
 * komutu bu dosyanın ÜZERİNE yazacak ve tüm tablo/kolon adları tipli hale gelecek.
 * O andan itibaren yanlış kolon adı derleme hatası verir — bu dosya elle düzenlenmez.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type GenericRow = Record<string, any>;

type GenericTable = {
  Row: GenericRow;
  Insert: GenericRow;
  Update: GenericRow;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: Record<string, GenericTable>;
    Views: Record<string, GenericTable>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, never>;
  };
};
