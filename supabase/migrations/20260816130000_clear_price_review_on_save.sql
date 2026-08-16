-- KÖPRÜ — Fiyat uyarısı kaydedince kapanır
--
-- 20260816120000 birleştirmede farklı fiyat bulunan ürünlere
-- `price_review_needed` bayrağı koyuyor ve Ürün Yönetimi'nde uyarı
-- çıkıyor. Uyarının kapanma yolu yoktu: üretici fiyatı düzeltse bile
-- satırda asılı kalırdı.
--
-- Ayrı bir "okudum" düğmesi EKLENMEDİ. Ürünü kaydetmek zaten üreticinin
-- o satıra bakıp karar verdiği andır; ikinci bir tık istemek gereksiz.
--
-- Gövde 20260816110000 sürümünden ALINDI; tek ekleme UPDATE listesinde.

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

grant execute on function public.save_product(
  uuid, text, text, numeric, numeric, uuid, text, text[], public.product_type,
  jsonb, jsonb, numeric, numeric, numeric, numeric, text, uuid
) to authenticated;

notify pgrst, 'reload schema';
