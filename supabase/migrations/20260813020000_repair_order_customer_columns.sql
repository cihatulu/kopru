-- KÖPRÜ — orders.customer_* kolonlarının onarımı
--
-- BELİRTİ: Sepetten sipariş verilemiyordu. `place_order_atomic` 400 dönüyor,
-- gerçek mesaj:
--     column "customer_email" of relation "orders" does not exist [42703]
--
-- SEBEP: `20260810043000_order_customer_fields.sql` migration'ı hem bu üç
-- kolonu ekliyor hem de RPC'yi güncelliyor. Uzak veritabanında migration
-- GEÇMİŞ TABLOSUNA YAZILMIŞ ama `alter table` gerçekte çalışmamış; sonraki
-- migration'lar RPC'yi bu kolonlara yazacak şekilde yeniden tanımlayınca
-- sipariş akışı tamamen kırılmış.
--
-- Kolonların gerçekten eksik olduğu şununla doğrulandı:
--     select column_name from information_schema.columns
--      where table_schema='public' and table_name='orders'
--        and column_name like 'customer%';
--   → yalnız customer_name, customer_phone, customer_address dönüyordu.
--
-- Aynı denetim tüm migration'lara uygulandı; başka eksik kolon veya fonksiyon
-- YOK. `sync_retailer_staff_assignments` bilerek kaldırılmıştı (20260811010000).
--
-- `if not exists` sayesinde bu dosya sıfır ortamda da güvenle çalışır:
-- kolonlar orada zaten önceki migration'dan gelmiş olur.

alter table public.orders
  add column if not exists customer_email text,
  add column if not exists customer_province text,
  add column if not exists customer_district text;

notify pgrst, 'reload schema';
