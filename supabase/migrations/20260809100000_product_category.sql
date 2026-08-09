-- KÖPRÜ — ürün kategorisi ve kalıcı silme
--
-- HİYERARŞİ: Grup › Kategori › Model.
-- Grup en üst kırılım (product_groups), kategori ortadaki kademe, model ise
-- ürünün kendi kodudur (products.code).
--
-- Kategori neden ayrı tablo DEĞİL: kaynak üründe (furniture-platform) serbest
-- metindi ve öyle kalıyor. Ayrı tablo olsaydı her yeni kategori için önce bir
-- yönetim ekranından tanım açmak gerekirdi; üretici ürün eklerken kategoriyi
-- oracıkta yazabilmeli. Yazım tutarlılığı arayüzdeki öneri listesiyle sağlanır.

alter table public.products add column if not exists category text;

-- Kategori bazlı filtreleme ve ağaç görünümü için. Grup ile birlikte indexlenir
-- çünkü ağaç her zaman "önce grup, sonra kategori" sırasıyla daralır.
create index if not exists products_group_category_idx
  on public.products (owner_org_id, group_id, category);

-- ============================================================ save_product

-- İMZA DEĞİŞİYOR: p_category eklendi. Kilitli kural 6 gereği önce DROP;
-- overload bırakılmaz (PostgREST 409 ambiguous call).
drop function if exists public.save_product(
  uuid, text, text, numeric, numeric, uuid, text, text[], public.product_type,
  jsonb, jsonb, numeric, numeric, numeric, numeric
);

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
  p_stock numeric default null,
  p_category text default null
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
  v_category text := nullif(btrim(coalesce(p_category, '')), '');
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
      owner_org_id, name, code, supplier_price, group_id, category, description, images,
      type, variants, set_contents, width_cm, depth_cm, height_cm
    ) values (
      v_me, btrim(p_name), btrim(p_code), p_supplier_price, p_group_id, v_category,
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

grant execute on function public.save_product(
  uuid, text, text, numeric, numeric, uuid, text, text[], public.product_type,
  jsonb, jsonb, numeric, numeric, numeric, numeric, text
) to authenticated;

-- ============================================================ kalıcı silme

/**
 * Ürünü KALICI olarak siler.
 *
 * Kilitli kural 16 "gerçek DELETE yalnız adminde" diyordu; kural, üreticinin
 * kendi PASİF ürününü silebilmesini kapsayacak şekilde genişletildi. Koruyucu
 * şart aynen duruyor: yalnız pasifleştirilmiş kayıt silinebilir.
 *
 * Sipariş geçmişi bozulmaz: `order_items.product_id` bu ürüne
 * `on delete set null` ile bağlıdır ve satırın adı/fiyatı `product_snapshot`
 * içinde durur. Yani geçmiş sipariş satırı silinmez, yalnız canlı ürün
 * bağlantısını kaybeder.
 *
 * Yalnız org SAHİBİ çağırabilir: geri alınamayan işlemlerde bu projedeki sınır
 * budur (bkz. set_staff_active, delete_product_group).
 */
create or replace function public.delete_product_permanently(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_row public.products%rowtype;
begin
  if public.get_my_org_kind() <> 'manufacturer' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if public.get_my_org_role() <> 'owner' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_row from public.products
   where id = p_id and owner_org_id = v_me
   for update;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Aktif ürün doğrudan silinemez. Önce pasife alınması, kullanıcıyı bir kez
  -- daha düşünmeye zorlayan bilinçli bir adımdır.
  if v_row.is_active then
    raise exception 'PRODUCT_IS_ACTIVE' using errcode = '22023';
  end if;

  -- Başka bir SETİN içindeyse silinmez: set içeriği o ürüne işaret ediyor ve
  -- silinirse takım sessizce eksik kalırdı.
  if exists (
    select 1 from public.products p
     where p.owner_org_id = v_me
       and p.type = 'set'
       and p.set_contents @> jsonb_build_array(jsonb_build_object('product_id', p_id::text))
  ) then
    raise exception 'PRODUCT_IN_SET' using errcode = '22023';
  end if;

  insert into public.system_logs (actor_user_id, actor_org_id, action, entity, entity_id, meta)
  values ((select auth.uid()), v_me, 'product.deleted', 'products', p_id,
          jsonb_build_object('name', v_row.name, 'code', v_row.code));

  -- product_costs, manufacturer_stock, retailer_stock, retail_prices bu ürüne
  -- `on delete cascade` ile bağlı; ayrıca temizlemeye gerek yok.
  delete from public.products where id = p_id and owner_org_id = v_me;
end;
$$;

grant execute on function public.delete_product_permanently(uuid) to authenticated;

notify pgrst, 'reload schema';
