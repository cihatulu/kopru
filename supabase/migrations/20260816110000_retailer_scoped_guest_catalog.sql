-- KÖPRÜ — Misafir üreticinin kataloğu perakendeci başına ayrılır
--
-- SORUN
-- `products` yalnız `owner_org_id` taşıyordu, yani "kenan mobilya'nın ürünü".
-- Ürünü HANGİ perakendecinin girdiği hiçbir yerde yazmıyordu. Aynı misafir
-- üreticiye bağlanan her perakendeci aynı havuzu görüyor ve düzenliyordu.
--
-- Canlı veride birebir yaşandı: `kenan mobilya` misafir, iki perakendeciye
-- bağlı. `adnan mobilya` 12 Ağustos'ta bağlanıp 7 ürün girmiş; `füsun
-- mobilya` 16 Ağustos'ta bağlanır bağlanmaz o 7 ürünü hazır buldu.
--
-- İSTENEN
-- Her perakendeci aynı misafir üreticinin FARKLI modellerini girebilsin ve
-- birbirininkini görmesin. Misafir üretici üye olduğunda hepsini görsün.
--
-- ÇÖZÜM
-- `managed_by_retailer_org_id`:
--   null  → ürün üreticinin kendisinin. Bugünkü davranış aynen sürer.
--   dolu  → bu perakendeci, misafir üretici adına girdi.
--
-- `owner_org_id`'ye DOKUNULMAZ. Ürün gerçekten üreticinin ürünüdür; sipariş,
-- cari ve stok zincirinin tamamı ona bağlıdır. Sahibi değiştirmek o zinciri
-- kırardı. Yeni kolon yalnız GÖRÜNÜRLÜĞÜ ve DÜZENLEME hakkını daraltır.

-- ============================================================ 1. kolon
alter table public.products
  add column if not exists managed_by_retailer_org_id uuid
    references public.organizations(id) on delete set null;

comment on column public.products.managed_by_retailer_org_id is
  'Ürünü misafir üretici adına giren perakendeci. null = üreticinin kendi ürünü.';

-- Kısmi index: kolonun dolu olduğu satırlar azınlıktır (yalnız misafir
-- üreticilerin katalogları), tüm tabloyu indekslemek yer israfı olurdu.
create index if not exists products_managed_by_retailer_idx
  on public.products (managed_by_retailer_org_id)
  where managed_by_retailer_org_id is not null;

-- ============================================================ 2. geri dolum
-- Mevcut ürünler, misafir üreticiyle `can_edit_catalog` açık EN ESKİ
-- ilişkisi olan perakendeciye atanır — ürünleri o girmiş olmalı, çünkü
-- diğerleri daha sonra bağlandı.
--
-- Üye üreticilerin ürünlerine dokunulmaz: onlar `null` kalır ve üretici
-- kendi kataloğunun sahibi olmayı sürdürür.
update public.products p
   set managed_by_retailer_org_id = ilk.retailer_org_id
  from (
    select r.manufacturer_org_id,
           r.retailer_org_id,
           row_number() over (
             partition by r.manufacturer_org_id
             order by r.created_at, r.id
           ) as sira
      from public.relationships r
      join public.organizations o on o.id = r.manufacturer_org_id
     where o.kind = 'manufacturer'
       and o.is_subscriber = false          -- yalnız MİSAFİR üretici
       and r.status = 'active'
       and r.can_edit_catalog = true
  ) ilk
 where ilk.sira = 1
   and p.owner_org_id = ilk.manufacturer_org_id
   and p.managed_by_retailer_org_id is null;

-- ============================================================ 3. kapsam kuralı
-- Kural TEK yerde durur: hem RLS hem RPC bunu çağırır. Ayrı ayrı yazılsaydı
-- ekranla sunucu er geç ayrışırdı — bu projede tam olarak böyle bir hata
-- yaşandı (`can_edit_catalog` üye üreticide de sayılıyordu).
create or replace function public.product_in_my_scope(p_managed_by uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    -- Üreticinin kendi ürünü: kapsam sınırı yok.
    p_managed_by is null
    -- Perakendeci: yalnız kendi girdiği ürün.
    or p_managed_by = public.get_my_org_id()
    -- Misafir üretici: hangi sponsorla giriş yaptıysa onun kapsamı. Aynı
    -- misafir iki perakendeciye bağlıysa, A ile girince A'nın, B ile
    -- girince B'nin işini yürütür.
    or p_managed_by = public.get_my_sponsor_org_id()
    -- ÜYE üretici: kataloğunun tamamı. Misafirken perakendecilerin onun
    -- adına girdiği ürünler de üye olunca kendisine açılır.
    or (public.get_my_org_kind() = 'manufacturer'
        and public.get_my_org_is_subscriber());
$$;

-- ============================================================ 4. RLS
drop policy if exists products_select_owner_or_customer on public.products;

create policy products_select_owner_or_customer on public.products
for select
using (
  -- Sahibi: kendi ürünleri, kapsam kuralına göre.
  (
    owner_org_id = (select public.get_my_org_id())
    and (select public.product_in_my_scope(products.managed_by_retailer_org_id))
  )
  -- Müşterisi: tedarikçisinin ürünleri. Başka bir perakendecinin girdiği
  -- ürünler GÖRÜNMEZ; üreticinin kendi ürünleri (null) herkese görünür.
  or (
    exists (
      select 1
        from public.relationships r
       where r.manufacturer_org_id = products.owner_org_id
         and r.retailer_org_id = (select public.get_my_org_id())
         and r.status = 'active'
         and (
           public.get_my_sponsor_org_id() is null
           or r.manufacturer_org_id = public.get_my_sponsor_org_id()
         )
    )
    and (
      products.managed_by_retailer_org_id is null
      or products.managed_by_retailer_org_id = (select public.get_my_org_id())
    )
  )
  or (select public.is_platform_admin())
);

-- ============================================================ 5. save_product
-- Gövde 20260816020000 sürümünden ALINDI; yalnız iki nokta değişti:
--   · INSERT ürünü ekleyen perakendeciye yazar
--   · UPDATE başka perakendecinin ürününü düzenletmez

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
        and r.can_edit_catalog = true
        and org.is_subscriber = false
    ) then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    v_owner := p_owner_org_id;
  else
    if v_kind <> 'manufacturer' then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    -- Misafir üreticinin ürün yönetimi anahtara bağlıdır.
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
     where g.id = p_group_id and g.owner_org_id = v_owner
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
      -- Perakendeci misafir üretici adına ekliyorsa ürün ONA yazılır;
      -- üretici kendi ürününü eklerken null kalır.
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
           height_cm = p_height
     where id = p_id
       and owner_org_id = v_owner
       -- Başka bir perakendecinin girdiği ürün düzenlenemez. Eşleşme
       -- olmazsa aşağıdaki PRODUCT_NOT_FOUND'a düşer.
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

  -- Ürün formundaki BAŞLANGIÇ stoğu: Ürün Yönetimi'nin parçasıdır, Stok
  -- Yönetimi ekranı değildir. Yetki yukarıda zaten doğrulandı.
  if p_stock is not null and p_stock >= 0 then
    insert into public.manufacturer_stock (owner_org_id, product_id, quantity)
    values (v_owner, v_id, p_stock)
    on conflict (owner_org_id, product_id)
      do update set quantity = excluded.quantity, updated_at = now();
  end if;

  return v_id;
end;
$$;

grant execute on function public.save_product(
  uuid, text, text, numeric, numeric, uuid, text, text[], public.product_type,
  jsonb, jsonb, numeric, numeric, numeric, numeric, text, uuid
) to authenticated;



-- ============================================================ 6. kalıcı silme
-- Gövde 20260811020000 sürümünden ALINDI; kapsam koşulu iki yere eklendi.

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
        and r.can_edit_catalog = true
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
     -- Başka bir perakendecinin girdiği ürün silinemez.
     and public.product_in_my_scope(managed_by_retailer_org_id);
  if not found then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_active then
    raise exception 'PRODUCT_IS_ACTIVE' using errcode = 'P0001';
  end if;

  select true into v_in_set from public.products
   where owner_org_id = v_owner
     and type = 'set'
     and set_contents @> ('[{"product_id": "' || p_id::text || '"}]')::jsonb
   limit 1;
  if found then
    raise exception 'PRODUCT_IN_SET' using errcode = 'P0001';
  end if;

  delete from public.products
   where id = p_id
     and owner_org_id = v_owner
     and public.product_in_my_scope(managed_by_retailer_org_id);
end;
$$;

notify pgrst, 'reload schema';
