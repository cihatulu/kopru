-- KÖPRÜ — Stok tutma hakkı ÜYE tarafındır
--
-- KURAL: stok yazan taraf abone (üye) olmak zorundadır. Misafir taraf kural
-- olarak kendi deposunu tutmaz; yalnız karşısındaki üyenin stoğunu GÖRÜR.
-- Tek istisna: üye perakendeci `relationships.can_edit_catalog` anahtarını
-- açarsa, misafir üreticisi de kendi stoğunu tutabilir.
--
-- Dört durum:
--   üye üretici  ↔ misafir perakendeci  → yalnız üretici yazar
--   üye üretici  ↔ üye perakendeci      → ikisi de kendi deposuna yazar
--   üye perakendeci ↔ misafir üretici, anahtar AÇIK   → ikisi de yazar
--   üye perakendeci ↔ misafir üretici, anahtar KAPALI → yalnız perakendeci yazar
--
-- NEDEN SUNUCUDA: menüyü gizlemek ve rotayı `RequireSubscriber` ile kapatmak
-- yalnız BİRİNCİ katmandır (kilitli kural 15). RPC doğrudan da çağrılabilir;
-- yetki kararı burada verilir.
--
-- Görme tarafına DOKUNULMAZ: `retailer_stock` yalnız sahibine görünür
-- (`retailer_stock_select_owner`) — perakendecinin kendi deposunu ne üye ne
-- misafir üretici görebilir. `manufacturer_stock` ise aktif ilişkideki
-- perakendeciye açıktır. Bu politikalar zaten kurala uygun.

-- ============================================================ abonelik yardımcısı
-- SECURITY DEFINER STABLE: politika ve RPC içinden çağrıldığında aynı tabloyu
-- yeniden sorgulama sorununa düşmemek için (kilitli kural 4).

create or replace function public.get_my_org_is_subscriber()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select o.is_subscriber
    from public.users u
    join public.organizations o on o.id = u.org_id
   where u.id = (select auth.uid());
$$;

grant execute on function public.get_my_org_is_subscriber() to authenticated;

-- ============================================================ üretici stoğu
-- Misafir üretici yalnız kendisine ÜRÜN YÖNETİMİ izni verilmiş AKTİF bir
-- ilişki varsa stok tutabilir. A9: denormalize `manufacturer_org_id` üzerinden
-- eşitlik; `relationship_id IN (...)` deseni yok.

create or replace function public.manufacturer_may_write_stock()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.get_my_org_is_subscriber()
      or exists (
        select 1
          from public.relationships r
         where r.manufacturer_org_id = public.get_my_org_id()
           and r.status = 'active'
           and r.can_edit_catalog
      );
$$;

grant execute on function public.manufacturer_may_write_stock() to authenticated;

drop function if exists public.set_product_stock(uuid, numeric);

create or replace function public.set_product_stock(p_product_id uuid, p_quantity numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
begin
  if public.get_my_org_kind() <> 'manufacturer' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if public.get_my_org_role() not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if not public.manufacturer_may_write_stock() then
    raise exception 'STOCK_NOT_ALLOWED' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity < 0 then
    raise exception 'INVALID_QUANTITY' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.products p where p.id = p_product_id and p.owner_org_id = v_me
  ) then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.manufacturer_stock (owner_org_id, product_id, quantity)
  values (v_me, p_product_id, p_quantity)
  on conflict (owner_org_id, product_id)
    do update set quantity = excluded.quantity, updated_at = now();
end;
$$;

grant execute on function public.set_product_stock(uuid, numeric) to authenticated;

drop function if exists public.bulk_update_stock(jsonb);

create or replace function public.bulk_update_stock(p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_row jsonb;
  v_product_id uuid;
  v_qty numeric(14,3);
  v_count int := 0;
begin
  if public.get_my_org_kind() <> 'manufacturer' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if public.get_my_org_role() not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if not public.manufacturer_may_write_stock() then
    raise exception 'STOCK_NOT_ALLOWED' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'INVALID_PAYLOAD' using errcode = '22023';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_product_id := nullif(v_row->>'product_id', '')::uuid;
    v_qty := nullif(v_row->>'quantity', '')::numeric;
    if v_product_id is null or v_qty is null or v_qty < 0 then
      continue;
    end if;

    -- Yalnız KENDİ ürünü güncellenebilir; CSV'ye yabancı bir id yazmak
    -- başkasının stoğuna dokunmaya yetmez.
    if not exists (
      select 1 from public.products p
       where p.id = v_product_id and p.owner_org_id = v_me
    ) then
      continue;
    end if;

    insert into public.manufacturer_stock (owner_org_id, product_id, quantity)
    values (v_me, v_product_id, v_qty)
    on conflict (owner_org_id, product_id)
      do update set quantity = excluded.quantity, updated_at = now();

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.bulk_update_stock(jsonb) to authenticated;

-- ============================================================ perakendeci stoğu
-- Misafir perakendecinin İSTİSNASI YOKTUR: yalnız tedarikçisinin stoğunu görür.

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
     where p.id = p_product_id
       and p.is_active
       and r.retailer_org_id = v_me
       and r.status = 'active'
  ) then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.retailer_stock (retailer_org_id, retailer_kind, product_id, quantity)
  values (v_me, 'retailer', p_product_id, p_quantity)
  on conflict (retailer_org_id, product_id)
    do update set quantity = excluded.quantity, updated_at = now();
end;
$$;

grant execute on function public.set_retailer_stock(uuid, numeric) to authenticated;

drop function if exists public.bulk_update_retailer_stock(jsonb);

create or replace function public.bulk_update_retailer_stock(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_row jsonb;
  v_product_id uuid;
  v_quantity numeric;
  v_count integer := 0;
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

  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_product_id := nullif(v_row->>'product_id', '')::uuid;
    v_quantity := nullif(v_row->>'quantity', '')::numeric;

    if v_product_id is null or v_quantity is null or v_quantity < 0 then
      continue;
    end if;

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

    insert into public.retailer_stock (retailer_org_id, retailer_kind, product_id, quantity)
    values (v_me, 'retailer', v_product_id, v_quantity)
    on conflict (retailer_org_id, product_id)
      do update set quantity = excluded.quantity, updated_at = now();

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.bulk_update_retailer_stock(jsonb) to authenticated;

notify pgrst, 'reload schema';
