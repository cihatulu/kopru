-- KÖPRÜ — ürün görselleri için Storage
--
-- Klasör düzeni: <owner_org_id>/<product_id>/<index>_<timestamp>.<ext>
-- İlk klasör adının org id olması, RLS'in yol üzerinden sahiplik kurmasını sağlar.
--
-- Bucket PUBLIC okunabilir: katalog görselleri zaten müşterilere gösterilecek ve
-- imzalı URL üretmek her liste satırında ek istek demek olurdu. Gizli olan
-- fiyatlardır, görseller değil. YAZMA ise sahibiyle sınırlıdır.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Okuma: herkese açık (bucket public).
drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
on storage.objects for select
to public
using (bucket_id = 'product-images');

-- Yazma/silme: yalnız kendi org klasörüne. Yol ilk parçası org id olmak zorunda.
drop policy if exists "product_images_owner_write" on storage.objects;
create policy "product_images_owner_write"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select public.get_my_org_id())::text
);

drop policy if exists "product_images_owner_update" on storage.objects;
create policy "product_images_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select public.get_my_org_id())::text
);

drop policy if exists "product_images_owner_delete" on storage.objects;
create policy "product_images_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select public.get_my_org_id())::text
);

-- Ürün görselleri `products.images` kolonunda (text[]) zaten tutuluyor;
-- save_product RPC'sine görsel parametresi eklenir.
drop function if exists public.save_product(uuid, text, text, numeric, numeric, uuid, text);

create or replace function public.save_product(
  p_id uuid,
  p_name text,
  p_code text,
  p_supplier_price numeric,
  p_cost_price numeric default null,
  p_group_id uuid default null,
  p_description text default null,
  p_images text[] default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_kind public.org_kind := public.get_my_org_kind();
  v_id uuid;
begin
  if v_kind <> 'manufacturer' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if public.get_my_org_role() not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if coalesce(btrim(p_name), '') = '' or coalesce(btrim(p_code), '') = '' then
    raise exception 'NAME_AND_CODE_REQUIRED' using errcode = '22023';
  end if;
  if p_supplier_price is null or p_supplier_price < 0 then
    raise exception 'INVALID_PRICE' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.products
      (owner_org_id, name, code, supplier_price, group_id, description, images)
    values
      (v_me, btrim(p_name), btrim(p_code), p_supplier_price, p_group_id, p_description,
       coalesce(p_images, '{}'))
    returning id into v_id;
  else
    update public.products
       set name = btrim(p_name),
           code = btrim(p_code),
           supplier_price = p_supplier_price,
           group_id = p_group_id,
           description = p_description,
           images = coalesce(p_images, images)
     where id = p_id and owner_org_id = v_me
    returning id into v_id;

    if v_id is null then
      raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
    end if;
  end if;

  -- KATMAN 1 — gizli maliyet. Boş bırakılırsa kayıt silinir; sıfır yazılmaz,
  -- çünkü "maliyeti bilmiyorum" ile "maliyeti sıfır" farklı şeylerdir.
  if p_cost_price is null then
    delete from public.product_costs where product_id = v_id;
  else
    insert into public.product_costs (product_id, owner_org_id, cost_price)
    values (v_id, v_me, p_cost_price)
    on conflict (product_id)
      do update set cost_price = excluded.cost_price, updated_at = now();
  end if;

  return v_id;
end;
$$;

notify pgrst, 'reload schema';
