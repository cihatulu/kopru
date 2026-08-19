-- KÖPRÜ — Misafir Üretici Ürün Yönetimi İzin Mantığı Güncellemesi
--
-- Anahtar Kapalıyken (can_edit_catalog = false): Perakendeci ürün yönetimini kullanabilir (ürün/grup ekler, siler, düzenler). Misafir üretici panelinde modülü göremez.
-- Anahtar Açıkken (can_edit_catalog = true): Misafir üretici kendi panelinde modülü görür ve yönetir. Perakendeci sadece kendi satış fiyatını günceller.

-- ============================================================ 1. save_product_group
create or replace function public.save_product_group(
  p_id uuid default null,
  p_name text default null,
  p_sort_order integer default 0,
  p_owner_org_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_kind public.org_kind := public.get_my_org_kind();
  v_owner uuid;
  v_id uuid;
begin
  if public.get_my_org_role() not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_owner_org_id is not null and p_owner_org_id <> v_me then
    if v_kind <> 'retailer' then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;

    if not exists (
      select 1 from public.relationships r
      join public.organizations org on org.id = r.manufacturer_org_id
      where r.manufacturer_org_id = p_owner_org_id
        and r.retailer_org_id = v_me
        and r.status = 'active'
        and r.can_edit_catalog = false -- Perakendeci yalnız anahtar kapalıyken ekleyebilir
        and org.is_subscriber = false
    ) then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    v_owner := p_owner_org_id;
  else
    if v_kind <> 'manufacturer' then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    v_owner := v_me;
  end if;

  if coalesce(btrim(p_name), '') = '' then
    raise exception 'NAME_REQUIRED' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.product_groups (owner_org_id, managed_by_retailer_org_id, name, sort_order)
    values (
      v_owner,
      case when v_owner <> v_me then v_me else null end,
      btrim(p_name), coalesce(p_sort_order, 0)
    )
    returning id into v_id;
  else
    update public.product_groups
       set name = btrim(p_name), sort_order = coalesce(p_sort_order, sort_order)
     where id = p_id
       and owner_org_id = v_owner
       and public.product_in_my_scope(managed_by_retailer_org_id)
    returning id into v_id;
    if v_id is null then
      raise exception 'GROUP_NOT_FOUND' using errcode = 'P0002';
    end if;
  end if;

  return v_id;
end;
$$;

-- ============================================================ 2. delete_product_group
create or replace function public.delete_product_group(
  p_id uuid,
  p_owner_org_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_kind public.org_kind := public.get_my_org_kind();
  v_owner uuid;
begin
  if public.get_my_org_role() not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_owner_org_id is not null and p_owner_org_id <> v_me then
    if v_kind <> 'retailer' then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    if not exists (
      select 1 from public.relationships r
      join public.organizations org on org.id = r.manufacturer_org_id
      where r.manufacturer_org_id = p_owner_org_id
        and r.retailer_org_id = v_me
        and r.status = 'active'
        and r.can_edit_catalog = false -- Perakendeci yalnız anahtar kapalıyken silebilir
        and org.is_subscriber = false
    ) then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    v_owner := p_owner_org_id;
  else
    if v_kind <> 'manufacturer' then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    v_owner := v_me;
  end if;

  delete from public.product_groups
   where id = p_id
     and owner_org_id = v_owner
     and public.product_in_my_scope(managed_by_retailer_org_id);
end;
$$;

-- ============================================================ 3. save_product
create or replace function public.save_product(
  p_id uuid default null,
  p_name text default null,
  p_code text default null,
  p_supplier_price numeric default null,
  p_cost_price numeric default null,
  p_group_id uuid default null,
  p_description text default null,
  p_images text[] default null,
  p_type public.product_type default 'single',
  p_variants jsonb default '[]'::jsonb,
  p_set_contents jsonb default '[]'::jsonb,
  p_width numeric default null,
  p_depth numeric default null,
  p_height numeric default null,
  p_stock numeric default null,
  p_category text default null,
  p_owner_org_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_kind public.org_kind := public.get_my_org_kind();
  v_owner uuid;
  v_id uuid;
  v_line jsonb;
  v_category text := nullif(btrim(coalesce(p_category, '')), '');
begin
  if public.get_my_org_role() not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_owner_org_id is not null and p_owner_org_id <> v_me then
    if v_kind <> 'retailer' then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    if not exists (
      select 1 from public.relationships r
      join public.organizations org on org.id = r.manufacturer_org_id
      where r.manufacturer_org_id = p_owner_org_id
        and r.retailer_org_id = v_me
        and r.status = 'active'
        and r.can_edit_catalog = false -- Perakendeci yalnız anahtar kapalıyken ürün kaydedebilir
        and org.is_subscriber = false
    ) then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    v_owner := p_owner_org_id;
  else
    if v_kind <> 'manufacturer' then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    -- Misafir üreticinin ürün yönetimi anahtara bağlıdır (açık olmalıdır)
    if not public.manufacturer_may_manage_products() then
      raise exception 'PRODUCTS_NOT_ALLOWED' using errcode = '42501';
    end if;
    v_owner := v_me;
  end if;

  if coalesce(btrim(p_name), '') = '' or coalesce(btrim(p_code), '') = '' then
    raise exception 'NAME_AND_CODE_REQUIRED' using errcode = '22023';
  end if;
  if p_supplier_price is null or p_supplier_price < 0 then
    raise exception 'INVALID_PRICE' using errcode = '22023';
  end if;

  if p_group_id is not null and not exists (
    select 1 from public.product_groups g
     where g.id = p_group_id
       and g.owner_org_id = v_owner
       and public.product_in_my_scope(g.managed_by_retailer_org_id)
  ) then
    raise exception 'GROUP_NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_type = 'set' then
    for v_line in select * from jsonb_array_elements(coalesce(p_set_contents, '[]'::jsonb)) loop
      if not exists (
        select 1 from public.products p
         where p.id = (v_line->>'product_id')::uuid and p.owner_org_id = v_owner
      ) then
        raise exception 'SET_ITEM_NOT_FOUND' using errcode = 'P0002';
      end if;
    end loop;
  end if;

  if p_id is null then
    insert into public.products (
      owner_org_id, managed_by_retailer_org_id,
      name, code, supplier_price, group_id, category, description, images,
      type, variants, set_contents, width_cm, depth_cm, height_cm
    ) values (
      v_owner,
      case when v_owner <> v_me then v_me else null end,
      btrim(p_name), btrim(p_code), p_supplier_price, p_group_id, v_category,
      p_description, coalesce(p_images, '{}'), p_type, coalesce(p_variants, '[]'::jsonb),
      coalesce(p_set_contents, '[]'::jsonb), p_width, p_depth, p_height
    )
    returning id into v_id;
  else
    update public.products
       set name = btrim(p_name),
           code = btrim(p_code),
           supplier_price = p_supplier_price,
           group_id = p_group_id,
           category = v_category,
           description = p_description,
           images = coalesce(p_images, images),
           type = p_type,
           variants = coalesce(p_variants, variants),
           set_contents = coalesce(p_set_contents, set_contents),
           width_cm = p_width,
           depth_cm = p_depth,
           height_cm = p_height,
           price_review_needed = false
     where id = p_id
       and owner_org_id = v_owner
       and public.product_in_my_scope(managed_by_retailer_org_id)
    returning id into v_id;

    if v_id is null then
      raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
    end if;
  end if;

  if p_cost_price is null then
    delete from public.product_costs where product_id = v_id;
  else
    insert into public.product_costs (product_id, owner_org_id, cost_price)
    values (v_id, v_owner, p_cost_price)
    on conflict (product_id)
      do update set cost_price = excluded.cost_price, updated_at = now();
  end if;

  if p_stock is not null and p_stock >= 0 then
    insert into public.manufacturer_stock (owner_org_id, product_id, quantity)
    values (v_owner, v_id, p_stock)
    on conflict (owner_org_id, product_id)
      do update set quantity = excluded.quantity, updated_at = now();
  end if;

  return v_id;
end;
$$;

-- ============================================================ 4. delete_product_permanently
create or replace function public.delete_product_permanently(
  p_id uuid,
  p_owner_org_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_kind public.org_kind := public.get_my_org_kind();
  v_owner uuid;
  v_active boolean;
  v_in_set boolean;
begin
  if public.get_my_org_role() not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_owner_org_id is not null and p_owner_org_id <> v_me then
    if v_kind <> 'retailer' then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    if not exists (
      select 1 from public.relationships r
      join public.organizations org on org.id = r.manufacturer_org_id
      where r.manufacturer_org_id = p_owner_org_id
        and r.retailer_org_id = v_me
        and r.status = 'active'
        and r.can_edit_catalog = false -- Perakendeci yalnız anahtar kapalıyken silebilir
        and org.is_subscriber = false
    ) then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    v_owner := p_owner_org_id;
  else
    if v_kind <> 'manufacturer' then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    v_owner := v_me;
  end if;

  select is_active into v_active from public.products
   where id = p_id
     and owner_org_id = v_owner
     and public.product_in_my_scope(managed_by_retailer_org_id);
  if not found then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_active then
    raise exception 'PRODUCT_MUST_BE_PASSIVE' using errcode = '22023';
  end if;

  select exists (
    select 1 from public.products
     where set_contents @> jsonb_build_array(jsonb_build_object('product_id', p_id))
  ) into v_in_set;
  if v_in_set then
    raise exception 'PRODUCT_IN_USE_BY_SET' using errcode = '23000';
  end if;

  delete from public.products where id = p_id;
end;
$$;

-- ============================================================ 5. bulk_update_retailer_stock
create or replace function public.bulk_update_retailer_stock(
  p_rows jsonb,
  p_manufacturer_org_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_row jsonb;
  v_product_id uuid;
  v_quantity numeric;
  v_name text;
  v_code text;
  v_category text;
  v_may_create boolean := false;
  v_updated int := 0;
  v_created int := 0;
begin
  if public.get_my_org_kind() <> 'retailer' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if public.get_my_org_role() not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if not public.get_my_org_is_subscriber() then
    raise exception 'STOCK_NOT_ALLOWED' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'INVALID_PAYLOAD' using errcode = '22023';
  end if;

  if p_manufacturer_org_id is not null then
    select exists (
      select 1
        from public.relationships r
        join public.organizations o on o.id = r.manufacturer_org_id
       where r.manufacturer_org_id = p_manufacturer_org_id
         and r.retailer_org_id = v_me
         and r.status = 'active'
         and r.can_edit_catalog = false -- Perakendeci yalnız anahtar kapalıyken ürün açabilir
         and o.is_subscriber = false
    ) into v_may_create;

    if not v_may_create then
      raise exception 'CATALOG_NOT_ALLOWED' using errcode = '42501';
    end if;
  end if;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_product_id := nullif(v_row->>'product_id', '')::uuid;
    v_quantity := nullif(v_row->>'quantity', '')::numeric;
    v_name := nullif(btrim(coalesce(v_row->>'name', '')), '');
    v_code := btrim(coalesce(v_row->>'code', ''));
    v_category := nullif(btrim(coalesce(v_row->>'category', '')), '');

    if v_quantity is null or v_quantity < 0 then
      continue;
    end if;

    if v_product_id is null then
      if v_name is null then
        continue;
      end if;
      if not v_may_create then
        raise exception 'MANUFACTURER_REQUIRED' using errcode = '22023';
      end if;

      insert into public.products
        (owner_org_id, name, code, category, supplier_price, is_active)
      values
        (p_manufacturer_org_id, v_name, v_code, v_category, 0, false)
      returning id into v_product_id;

      v_created := v_created + 1;
    else
      if not exists (
        select 1
          from public.products p
          join public.relationships r
            on r.manufacturer_org_id = p.owner_org_id
         where p.id = v_product_id
           and p.is_active
           and r.retailer_org_id = v_me
           and r.status = 'active'
      ) then
        continue;
      end if;
      v_updated := v_updated + 1;
    end if;

    insert into public.retailer_stock (retailer_org_id, product_id, quantity)
    values (v_me, v_product_id, v_quantity)
    on conflict (retailer_org_id, product_id)
      do update set quantity = excluded.quantity, updated_at = now();
  end loop;

  return jsonb_build_object('updated', v_updated, 'created', v_created);
end;
$$;

-- ============================================================ 6. product_costs RLS Policy
drop policy if exists "product_costs_owner_or_retailer_editor" on public.product_costs;

create policy "product_costs_owner_or_retailer_editor"
on public.product_costs for all to authenticated
using (
  owner_org_id = public.get_my_org_id()
  or (select public.is_platform_admin())
  or exists (
    select 1 from public.relationships r
    join public.organizations org on org.id = r.manufacturer_org_id
    where r.manufacturer_org_id = public.product_costs.owner_org_id
      and r.retailer_org_id = public.get_my_org_id()
      and r.status = 'active'
      and r.can_edit_catalog = false -- Perakendeci yalnız anahtar kapalıyken maliyetleri yönetir
      and org.is_subscriber = false
  )
)
with check (
  owner_org_id = public.get_my_org_id()
  or (select public.is_platform_admin())
  or exists (
    select 1 from public.relationships r
    join public.organizations org on org.id = r.manufacturer_org_id
    where r.manufacturer_org_id = public.product_costs.owner_org_id
      and r.retailer_org_id = public.get_my_org_id()
      and r.status = 'active'
      and r.can_edit_catalog = false -- Perakendeci yalnız anahtar kapalıyken maliyetleri yönetir
      and org.is_subscriber = false
  )
);

-- ============================================================ 7. Storage product-images Bucket Policies
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
        and r.can_edit_catalog = false -- Perakendeci yalnız anahtar kapalıyken görsel yükleyebilir
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
        and r.can_edit_catalog = false -- Perakendeci yalnız anahtar kapalıyken görsel güncelleyebilir
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
        and r.can_edit_catalog = false -- Perakendeci yalnız anahtar kapalıyken görsel silebilir
        and org.is_subscriber = false
    )
  )
);

notify pgrst, 'reload schema';
