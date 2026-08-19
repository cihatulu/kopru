-- KÖPRÜ — Misafir Üretici Grup Atama İzin Mantığı Güncellemesi
--
-- Anahtar Kapalıyken (can_edit_catalog = false): Perakendeci misafir üreticinin ürünlerini gruplara atayabilir.

-- ============================================================ 1. assign_products_to_group
create or replace function public.assign_products_to_group(
  p_product_ids uuid[],
  p_group_id uuid default null,
  p_owner_org_id uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_kind public.org_kind := public.get_my_org_kind();
  v_owner uuid;
  v_count int;
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
        and r.can_edit_catalog = false -- Perakendeci yalnız anahtar kapalıyken atama yapabilir
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

  if p_group_id is not null and not exists (
    select 1 from public.product_groups g
     where g.id = p_group_id and g.owner_org_id = v_owner
  ) then
    raise exception 'GROUP_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.products
     set group_id = p_group_id
   where id = any(p_product_ids)
     and owner_org_id = v_owner;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ============================================================ 2. set_group_products
create or replace function public.set_group_products(
  p_group_id uuid,
  p_product_ids uuid[],
  p_owner_org_id uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_kind public.org_kind := public.get_my_org_kind();
  v_owner uuid;
  v_count int;
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
        and r.can_edit_catalog = false -- Perakendeci yalnız anahtar kapalıyken atama yapabilir
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

  if not exists (
    select 1 from public.product_groups g
     where g.id = p_group_id and g.owner_org_id = v_owner
  ) then
    raise exception 'GROUP_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.products
     set group_id = null
   where owner_org_id = v_owner
     and group_id = p_group_id
     and not (id = any(coalesce(p_product_ids, '{}'::uuid[])));

  update public.products
     set group_id = p_group_id
   where owner_org_id = v_owner
     and id = any(coalesce(p_product_ids, '{}'::uuid[]));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

notify pgrst, 'reload schema';
