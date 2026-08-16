-- KÖPRÜ — Ürün GRUPLARI da perakendeci başına ayrılır
--
-- SORUN
-- 20260816110000 ürünleri perakendeci başına ayırdı ama GRUPLARI atladı.
-- Sonuç ekranda şöyle göründü: yeni bağlanan perakendeci diğerinin
-- ürünlerini göremiyor (doğru) ama sol menüdeki ağaçta onun grubunu
-- görüyor — üstelik grup boş, çünkü içindeki ürünler kapsam dışı.
--
-- Yani kullanıcıya hem başkasının grup adı sızıyor hem de tıklayınca hiçbir
-- şey çıkmayan ölü bir düğüm duruyor.
--
-- Kural ürünlerdekiyle birebir aynı: `product_in_my_scope`.
--
-- NOT: `save_product` gruba da bakıyor (`p_group_id` sahibin mi diye).
-- SECURITY DEFINER fonksiyonlarında RLS devreye girmediği için o kontrole
-- de kapsam koşulu eklenir; yoksa perakendeci ürününü BAŞKA bir
-- perakendecinin grubuna atayabilirdi.

-- ============================================================ 1. kolon
alter table public.product_groups
  add column if not exists managed_by_retailer_org_id uuid
    references public.organizations(id) on delete set null;

comment on column public.product_groups.managed_by_retailer_org_id is
  'Grubu misafir üretici adına açan perakendeci. null = üreticinin kendi grubu.';

create index if not exists product_groups_managed_by_retailer_idx
  on public.product_groups (managed_by_retailer_org_id)
  where managed_by_retailer_org_id is not null;

-- ============================================================ 2. geri dolum
-- Ürünlerdekiyle AYNI kural: misafir üreticinin grupları, o üreticiyle
-- `can_edit_catalog` açık en eski ilişkisi olan perakendeciye atanır.
update public.product_groups g
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
       and o.is_subscriber = false
       and r.status = 'active'
       and r.can_edit_catalog = true
  ) ilk
 where ilk.sira = 1
   and g.owner_org_id = ilk.manufacturer_org_id
   and g.managed_by_retailer_org_id is null;

-- ============================================================ 3. RLS
drop policy if exists product_groups_select_owner_or_customer on public.product_groups;

create policy product_groups_select_owner_or_customer on public.product_groups
for select
using (
  (
    owner_org_id = (select public.get_my_org_id())
    and (select public.product_in_my_scope(product_groups.managed_by_retailer_org_id))
  )
  or (
    exists (
      select 1
        from public.relationships r
       where r.manufacturer_org_id = product_groups.owner_org_id
         and r.retailer_org_id = (select public.get_my_org_id())
         and r.status = 'active'
         and (
           public.get_my_sponsor_org_id() is null
           or r.manufacturer_org_id = public.get_my_sponsor_org_id()
         )
    )
    and (
      product_groups.managed_by_retailer_org_id is null
      or product_groups.managed_by_retailer_org_id = (select public.get_my_org_id())
    )
  )
  or (select public.is_platform_admin())
);

-- ============================================================ 4. birleştirme
-- Üye olunca gruplarda da kapsam sınırı kalkar. Gruplar BİRLEŞTİRİLMEZ:
-- aynı adlı iki grup kalırsa üretici hangisini tutacağına kendisi karar
-- verir — grup birleştirmek ürünleri de taşımak demektir ve bu, adı aynı
-- diye otomatik yapılacak bir şey değildir.
create or replace function public.open_group_scope_for_org(p_org_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.product_groups
     set managed_by_retailer_org_id = null
   where owner_org_id = p_org_id
     and managed_by_retailer_org_id is not null;
$$;

revoke execute on function public.open_group_scope_for_org(uuid) from public;
revoke execute on function public.open_group_scope_for_org(uuid) from authenticated;


-- ============================================================ 5. grup kaydetme

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

  if coalesce(btrim(p_name), '') = '' then
    raise exception 'NAME_REQUIRED' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.product_groups (owner_org_id, managed_by_retailer_org_id, name, sort_order)
    values (
      v_owner,
      -- Perakendeci misafir üretici adına açıyorsa grup ONA yazılır.
      case when v_owner <> v_me then v_me else null end,
      btrim(p_name), coalesce(p_sort_order, 0)
    )
    returning id into v_id;
  else
    update public.product_groups
       set name = btrim(p_name), sort_order = coalesce(p_sort_order, sort_order)
     where id = p_id
       and owner_org_id = v_owner
       -- Başka bir perakendecinin grubu düzenlenemez.
       and public.product_in_my_scope(managed_by_retailer_org_id)
    returning id into v_id;
    if v_id is null then
      raise exception 'GROUP_NOT_FOUND' using errcode = 'P0002';
    end if;
  end if;

  return v_id;
end;
$$;

-- ============================================================ 6. grup silme

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

  -- Başka bir perakendecinin grubu silinemez.
  delete from public.product_groups
   where id = p_id
     and owner_org_id = v_owner
     and public.product_in_my_scope(managed_by_retailer_org_id);
end;
$$;


-- ============================================================ 7. save_product
-- Gövde 20260816130000 sürümünden ALINDI; grup doğrulamasına kapsam eklendi.

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

  -- Grup da kapsam kontrolünden geçer: SECURITY DEFINER içinde RLS
  -- devreye girmez, yoksa perakendeci ürününü BAŞKA bir perakendecinin
  -- grubuna atayabilirdi.
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
           height_cm = p_height,
           -- Üretici ürünü kaydettiyse fiyat uyarısını görmüş ve karar
           -- vermiş demektir; uyarı kendiliğinden kapanır.
           price_review_needed = false
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


-- ============================================================ 8. üyelik onayı
-- Gövde 20260816120000 sürümünden ALINDI; grup kapsamını açan çağrı eklendi.

create or replace function public.upgrade_org_to_subscriber(
  p_org_id uuid,
  p_plan public.plan_tier,
  p_subdomain text
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations%rowtype;
  v_sub text := lower(btrim(coalesce(p_subdomain, '')));
  v_birlesen integer;
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_org from public.organizations where id = p_org_id for update;
  if not found then
    raise exception 'ORG_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_org.is_subscriber then
    raise exception 'ALREADY_SUBSCRIBER' using errcode = '22023';
  end if;
  if v_sub = '' then
    raise exception 'SUBDOMAIN_REQUIRED' using errcode = '22023';
  end if;

  update public.organizations
     set is_subscriber = true,
         plan = p_plan,
         subdomain = v_sub,
         enabled_modules = public.default_modules_for_plan(p_plan)
   where id = p_org_id
  returning * into v_org;

  -- BURADA `relationships` TABLOSUNA HİÇBİR YAZMA YOKTUR VE OLMAMALIDIR.
  -- Yükselen org hem kendi panelinde çalışır hem eski sponsorunun müşterisi
  -- olarak kalır; sipariş geçmişi ve cari bakiyesi olduğu yerde durur.

  -- Misafirken perakendecilerin bu üretici adına girdiği ürünler artık
  -- üreticinin kendisine açılır ve mükerrerler teke iner. Yükseltme ile
  -- AYNI transaction'da olmak zorunda: yarım kalırsa üretici hem kendi
  -- kataloğunu göremez hem kopyalar durur.
  v_birlesen := public.merge_duplicate_products(p_org_id);
  -- Gruplarda da kapsam sınırı kalkar. Gruplar birleştirilmez; aynı adlı
  -- iki grup kalırsa üretici hangisini tutacağına kendisi karar verir.
  perform public.open_group_scope_for_org(p_org_id);

  insert into public.system_logs (actor_user_id, actor_org_id, action, entity, entity_id, meta)
  values ((select auth.uid()), p_org_id, 'org.upgraded', 'organizations', p_org_id,
          jsonb_build_object('plan', p_plan, 'subdomain', v_sub,
                             'merged_products', v_birlesen));

  return v_org;
end;
$$;

notify pgrst, 'reload schema';
