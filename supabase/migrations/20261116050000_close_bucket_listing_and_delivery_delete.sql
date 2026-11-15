-- (1) Herkese açık bucket'larda LİSTELEME kapatılır.
-- (2) customer_deliveries üzerindeki doğrudan DELETE politikası kaldırılır.
--
-- BULGU (16 Kasım 2026)
-- (1) `product-images` ve `announcement-images` bilinçli olarak public'tir
--     (20260807160000: "gizli olan fiyatlardır, görseller değil"). Public
--     bucket'ta nesne adresi (/object/public/…) RLS'e hiç bakmaz; yani
--     `*_public_read` SELECT politikaları görsel göstermek için GEREKSİZDİ.
--     Tek etkileri, giriş yapmamış ziyaretçinin /object/list ile bucket'taki
--     TÜM firmaların dosyalarını dökebilmesiydi (canlıda doğrulandı).
--     Kural 17: "public listing kapalı".
--
--     SELECT yetkisi yine de gerekir: `upsert` ve `remove` hedef satırı görmek
--     zorundadır. Bu yüzden politika silinmez, sahibin kendi klasörüne daraltılır.
--
-- (2) `customer_deliveries_delete` perakendeciye gerçek DELETE veriyordu
--     (kural 16: soft delete). Uygulama bunu kullanmaz; iptal yalnız
--     `cancel_customer_delivery` RPC'siyle yapılır.

-- ── (1) Ürün görselleri ──────────────────────────────────────────────────────
drop policy if exists "product_images_public_read" on storage.objects;
drop policy if exists "product_images_owner_select" on storage.objects;
create policy "product_images_owner_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select public.get_my_org_id())::text
);

-- ── (1) Duyuru görselleri ────────────────────────────────────────────────────
drop policy if exists "announcement_images_public_read" on storage.objects;
drop policy if exists "announcement_images_owner_select" on storage.objects;
create policy "announcement_images_owner_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'announcement-images'
  and (storage.foldername(name))[1] = (select public.get_my_org_id())::text
);

-- ── (2) Teslimat planı: gerçek DELETE yok ────────────────────────────────────
drop policy if exists "customer_deliveries_delete" on public.customer_deliveries;
