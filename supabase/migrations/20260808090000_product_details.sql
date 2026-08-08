-- KÖPRÜ — ürün detayları: boyut, varyant, set, stok, grup
--
-- `variants` ve `set_contents` kolonları ilk şemada zaten vardı; burada
-- kullanıma açılıyor. Boyutlar tek bir jsonb yerine AYRI kolonlar:
-- filtrelenebilir/sıralanabilir olmaları gerekiyor ve jsonb içinde sayı
-- karşılaştırması hem yavaş hem hataya açık.

alter table public.products
  add column width_cm numeric(8,1) check (width_cm is null or width_cm >= 0),
  add column depth_cm numeric(8,1) check (depth_cm is null or depth_cm >= 0),
  add column height_cm numeric(8,1) check (height_cm is null or height_cm >= 0);

comment on column public.products.variants is
  'Özellik listesi: [{"name":"Renk","options":["Ceviz","Beyaz"]}]. Fiyatı '
  'etkilemez; sipariş anında seçilen değer order_items.product_snapshot''a yazılır.';

comment on column public.products.set_contents is
  'Set içeriği: [{"product_id":"…","quantity":2}]. type=''set'' olduğunda anlamlı.';

-- ============================================================ ürün grupları

drop function if exists public.save_product_group(uuid, text, int);

create or replace function public.save_product_group(
  p_id uuid,
  p_name text,
  p_sort_order int default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_id uuid;
begin
  if public.get_my_org_kind() <> 'manufacturer' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if public.get_my_org_role() not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'NAME_REQUIRED' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.product_groups (owner_org_id, name, sort_order)
    values (v_me, btrim(p_name), coalesce(p_sort_order, 0))
    returning id into v_id;
  else
    update public.product_groups
       set name = btrim(p_name), sort_order = coalesce(p_sort_order, sort_order)
     where id = p_id and owner_org_id = v_me
    returning id into v_id;
    if v_id is null then
      raise exception 'GROUP_NOT_FOUND' using errcode = 'P0002';
    end if;
  end if;

  return v_id;
end;
$$;

drop function if exists public.delete_product_group(uuid);

create or replace function public.delete_product_group(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
begin
  if public.get_my_org_role() not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Gruptaki ürünler SİLİNMEZ, gruptan çıkarılır. Grup bir etikettir;
  -- silinmesi ürünün kendisini yok etmemeli.
  update public.products set group_id = null
   where group_id = p_id and owner_org_id = v_me;

  delete from public.product_groups where id = p_id and owner_org_id = v_me;
end;
$$;

-- ============================================================ genişletilmiş kaydetme

drop function if exists public.save_product(uuid, text, text, numeric, numeric, uuid, text, text[]);

create or replace function public.save_product(
  p_id uuid,
  p_name text,
  p_code text,
  p_supplier_price numeric,
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
  p_stock numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_id uuid;
  v_line jsonb;
begin
  if public.get_my_org_kind() <> 'manufacturer' then
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

  -- Grup başkasına aitse sessizce kabul etmek yerine reddedilir.
  if p_group_id is not null and not exists (
    select 1 from public.product_groups g
     where g.id = p_group_id and g.owner_org_id = v_me
  ) then
    raise exception 'GROUP_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Set içeriğindeki her ürün BİZE ait olmalı; aksi halde başkasının ürünü
  -- kendi setimize konulup katalogda gösterilebilirdi.
  if p_type = 'set' then
    for v_line in select * from jsonb_array_elements(coalesce(p_set_contents, '[]'::jsonb)) loop
      if not exists (
        select 1 from public.products p
         where p.id = (v_line->>'product_id')::uuid and p.owner_org_id = v_me
      ) then
        raise exception 'SET_ITEM_NOT_FOUND' using errcode = 'P0002';
      end if;
    end loop;
  end if;

  if p_id is null then
    insert into public.products (
      owner_org_id, name, code, supplier_price, group_id, description, images,
      type, variants, set_contents, width_cm, depth_cm, height_cm
    ) values (
      v_me, btrim(p_name), btrim(p_code), p_supplier_price, p_group_id, p_description,
      coalesce(p_images, '{}'), p_type, coalesce(p_variants, '[]'::jsonb),
      coalesce(p_set_contents, '[]'::jsonb), p_width, p_depth, p_height
    )
    returning id into v_id;
  else
    update public.products
       set name = btrim(p_name),
           code = btrim(p_code),
           supplier_price = p_supplier_price,
           group_id = p_group_id,
           description = p_description,
           images = coalesce(p_images, images),
           type = p_type,
           variants = coalesce(p_variants, variants),
           set_contents = coalesce(p_set_contents, set_contents),
           width_cm = p_width,
           depth_cm = p_depth,
           height_cm = p_height
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

  -- Stok verildiyse mutlak değer olarak ayarlanır (sipariş düşümünden farklı).
  if p_stock is not null and p_stock >= 0 then
    insert into public.manufacturer_stock (owner_org_id, product_id, quantity)
    values (v_me, v_id, p_stock)
    on conflict (owner_org_id, product_id)
      do update set quantity = excluded.quantity, updated_at = now();
  end if;

  return v_id;
end;
$$;

notify pgrst, 'reload schema';
