-- KÖPRÜ — Faz 6: ürün kaydetme
--
-- Ürünün iki fiyatı İKİ AYRI TABLODA yaşar (A4):
--   products.supplier_price  → iki taraf görür
--   product_costs.cost_price → yalnız üretici
--
-- Bu yüzden kaydetme tek transaction olmak zorunda; aksi halde ürün var ama
-- maliyeti yok (veya tersi) gibi yarım kayıtlar oluşur.

drop function if exists public.save_product(uuid, text, text, numeric, numeric, uuid, text);

create or replace function public.save_product(
  p_id uuid,
  p_name text,
  p_code text,
  p_supplier_price numeric,
  p_cost_price numeric default null,
  p_group_id uuid default null,
  p_description text default null
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
  -- Katalog üreticinindir; perakendeci ürün açamaz.
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
    insert into public.products (owner_org_id, name, code, supplier_price, group_id, description)
    values (v_me, btrim(p_name), btrim(p_code), p_supplier_price, p_group_id, p_description)
    returning id into v_id;
  else
    update public.products
       set name = btrim(p_name),
           code = btrim(p_code),
           supplier_price = p_supplier_price,
           group_id = p_group_id,
           description = p_description
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

-- Ürün pasifleştirme — soft delete (kilitli kural 16).
drop function if exists public.set_product_active(uuid, boolean);

create or replace function public.set_product_active(p_id uuid, p_active boolean)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.products%rowtype;
begin
  update public.products set is_active = p_active
   where id = p_id and owner_org_id = public.get_my_org_id()
  returning * into v_row;

  if not found then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;
  return v_row;
end;
$$;

notify pgrst, 'reload schema';
