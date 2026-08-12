-- KÖPRÜ — Perakendecinin Misafir Üretici İçin Görsel Yükleyebilmesi (Storage RLS)
--
-- Perakendeciler can_edit_catalog = true yetkisine sahip oldukları misafir üreticiler
-- için ürün görsellerini `product-images` bucket'ına yükleyebilmelidir.

drop policy if exists "product_images_owner_write" on storage.objects;
create policy "product_images_owner_write"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (
    (storage.foldername(name))[1] = (select public.get_my_org_id())::text
    or
    exists (
      select 1 from public.relationships r
      join public.organizations org on org.id = r.manufacturer_org_id
      where r.manufacturer_org_id::text = (storage.foldername(name))[1]
        and r.retailer_org_id = public.get_my_org_id()
        and r.status = 'active'
        and r.can_edit_catalog = true
        and org.is_subscriber = false
    )
  )
);

drop policy if exists "product_images_owner_update" on storage.objects;
create policy "product_images_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'product-images'
  and (
    (storage.foldername(name))[1] = (select public.get_my_org_id())::text
    or
    exists (
      select 1 from public.relationships r
      join public.organizations org on org.id = r.manufacturer_org_id
      where r.manufacturer_org_id::text = (storage.foldername(name))[1]
        and r.retailer_org_id = public.get_my_org_id()
        and r.status = 'active'
        and r.can_edit_catalog = true
        and org.is_subscriber = false
    )
  )
);

drop policy if exists "product_images_owner_delete" on storage.objects;
create policy "product_images_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'product-images'
  and (
    (storage.foldername(name))[1] = (select public.get_my_org_id())::text
    or
    exists (
      select 1 from public.relationships r
      join public.organizations org on org.id = r.manufacturer_org_id
      where r.manufacturer_org_id::text = (storage.foldername(name))[1]
        and r.retailer_org_id = public.get_my_org_id()
        and r.status = 'active'
        and r.can_edit_catalog = true
        and org.is_subscriber = false
    )
  )
);

notify pgrst, 'reload schema';
