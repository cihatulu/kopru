-- Ürün görseli SELECT politikası, yazma politikalarıyla AYNI kapsama getirilir.
--
-- HATA (16 Kasım 2026, 20261116050000'in yan etkisi): listelemeyi kapatırken
-- SELECT yalnız "kendi org klasörü" ile sınırlandı. Oysa INSERT/UPDATE/DELETE
-- politikaları, kataloğunu perakendecinin yönettiği MİSAFİR üreticinin
-- klasörünü de kapsar (can_edit_catalog = false, is_subscriber = false).
-- Storage yüklemesi yazdığı satırı okuyabilmek zorundadır; perakendecinin
-- misafir üretici adına görsel yüklemesi "new row violates row-level security
-- policy" ile düşüyordu.
--
-- Listeleme yine kapalıdır: anon'un hiçbir SELECT yetkisi yok, giriş yapmış
-- kullanıcı yalnız yazabildiği klasörleri görür.

drop policy if exists "product_images_owner_select" on storage.objects;
create policy "product_images_owner_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'product-images'
  and (
    (storage.foldername(name))[1] = (select public.get_my_org_id())::text
    or exists (
      select 1
        from public.relationships r
        join public.organizations org on org.id = r.manufacturer_org_id
       where r.manufacturer_org_id::text = (storage.foldername(storage.objects.name))[1]
         and r.retailer_org_id = (select public.get_my_org_id())
         and r.status = 'active'
         and r.can_edit_catalog = false
         and org.is_subscriber = false
    )
  )
);
