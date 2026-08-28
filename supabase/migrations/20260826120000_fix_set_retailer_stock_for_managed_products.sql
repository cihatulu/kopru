-- ============================================================
-- FIX: set_retailer_stock — Yönetilen Misafir Üretici Ürünleri
--
-- Perakendecinin kataloğunu yönettiği misafir üretici (can_edit_catalog = false,
-- is_subscriber = false) ürünleri `is_active = false` olarak oluşturulur.
-- `useRetailerStockList` ve `bulk_update_retailer_stock` bu ürünleri kabul
-- ederken, `set_retailer_stock` yalnız `p.is_active` şartı arıyordu ve
-- pasif yönetilen ürünlerde `PRODUCT_NOT_FOUND` (500) hatası veriyordu.
--
-- Bu düzeltme `set_retailer_stock` kontrolünü günceller.
-- ============================================================

drop function if exists public.set_retailer_stock(uuid, numeric);

create or replace function public.set_retailer_stock(p_product_id uuid, p_quantity numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
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
  if p_quantity is null or p_quantity < 0 then
    raise exception 'INVALID_QUANTITY' using errcode = '22023';
  end if;

  if not exists (
    select 1
      from public.products p
      join public.relationships r
        on r.manufacturer_org_id = p.owner_org_id
      join public.organizations o
        on o.id = r.manufacturer_org_id
     where p.id = p_product_id
       and (
         p.is_active
         or (
           r.can_edit_catalog = false
           and o.is_subscriber = false
         )
       )
       and r.retailer_org_id = v_me
       and r.status = 'active'
  ) then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- `retailer_kind` YAZILMAZ: üretilmiş kolondur.
  insert into public.retailer_stock (retailer_org_id, product_id, quantity)
  values (v_me, p_product_id, p_quantity)
  on conflict (retailer_org_id, product_id)
    do update set quantity = excluded.quantity, updated_at = now();
end;
$$;

grant execute on function public.set_retailer_stock(uuid, numeric) to authenticated;
