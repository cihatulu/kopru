-- KÖPRÜ — Tanınmayan ürün kimliği artık YENİ ÜRÜN sayılır
--
-- OLAY: kullanıcı şablonu indirip Excel'de açtı; Excel kimlik sütununu seri
-- sayı sanıp aşağı doldurma ile her satırın son karakterini bir artırdı
-- (…ebc0 → …ebc1). Dört kimlik de hiçbir üründe yoktu, dördü de atlandı ve
-- ekranda "0 ürünün stoğu güncellendi" yazdı. Kullanıcı ne yapacağını
-- anlayamadı — haklı olarak "yeni ürün hiç yükleyemiyor muyum" dedi.
--
-- KARAR: kimliği HİÇ VAR OLMAYAN satır artık yeni ürün olarak açılır. Zaten
-- ürün kimliğini SUNUCU üretiyor; dosyadaki değer oluşturmada hiç
-- kullanılmıyordu. Var olmayan bir kimlik yüzünden satırı çöpe atmak, hiçbir
-- şeyi korumadan veri kaybettiriyordu.
--
-- KORUNAN KURAL: kimlik VAR ama bize ait değilse satır ESKİSİ GİBİ atlanır.
-- Başkasının ürün kimliğiyle kendi kataloğumuzda ürün doğurmak yanlış olurdu.
--
-- Sızıntı yok: "atlandı mı, açıldı mı" farkı yalnız o uuid'nin var olup
-- olmadığını söyler; 122 bitlik rastgele uuid tahmin edilemez.

-- ============================================================ üretici
drop function if exists public.bulk_update_stock(jsonb);

create or replace function public.bulk_update_stock(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_row jsonb;
  v_product_id uuid;
  v_qty numeric(14,3);
  v_name text;
  v_code text;
  v_category text;
  v_owner uuid;
  v_updated int := 0;
  v_created int := 0;
  v_skipped int := 0;
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
    v_name := nullif(btrim(coalesce(v_row->>'name', '')), '');
    v_code := btrim(coalesce(v_row->>'code', ''));
    v_category := nullif(btrim(coalesce(v_row->>'category', '')), '');

    if v_qty is null or v_qty < 0 then
      continue;
    end if;

    v_owner := null;
    if v_product_id is not null then
      select p.owner_org_id into v_owner from public.products p where p.id = v_product_id;
    end if;

    if v_owner is not null and v_owner <> v_me then
      -- Başkasının ürünü: dokunulmaz, ürün de doğurmaz.
      v_skipped := v_skipped + 1;
      continue;
    end if;

    if v_owner is null then
      -- Kimlik boş YA DA hiçbir üründe yok → yeni ürün.
      if v_name is null then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      insert into public.products
        (owner_org_id, name, code, category, supplier_price, is_active)
      values
        (v_me, v_name, v_code, v_category, 0, false)
      returning id into v_product_id;

      v_created := v_created + 1;
    else
      v_updated := v_updated + 1;
    end if;

    insert into public.manufacturer_stock (owner_org_id, product_id, quantity)
    values (v_me, v_product_id, v_qty)
    on conflict (owner_org_id, product_id)
      do update set quantity = excluded.quantity, updated_at = now();
  end loop;

  return jsonb_build_object('updated', v_updated, 'created', v_created, 'skipped', v_skipped);
end;
$$;

grant execute on function public.bulk_update_stock(jsonb) to authenticated;

-- ============================================================ perakendeci
drop function if exists public.bulk_update_retailer_stock(jsonb, uuid);

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
  v_reachable boolean;
  v_exists boolean;
  v_may_create boolean := false;
  v_updated int := 0;
  v_created int := 0;
  v_skipped int := 0;
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
         and r.can_edit_catalog
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

    v_exists := false;
    v_reachable := false;
    if v_product_id is not null then
      select true into v_exists from public.products p where p.id = v_product_id;
      v_exists := coalesce(v_exists, false);

      -- Tedarikçim olan üreticinin AKTİF ürünü mü?
      select exists (
        select 1
          from public.products p
          join public.relationships r on r.manufacturer_org_id = p.owner_org_id
         where p.id = v_product_id
           and p.is_active
           and r.retailer_org_id = v_me
           and r.status = 'active'
      ) into v_reachable;
    end if;

    if v_exists and not v_reachable then
      -- Var ama bana kapalı: dokunulmaz, ürün de doğurmaz.
      v_skipped := v_skipped + 1;
      continue;
    end if;

    if not v_reachable then
      -- Kimlik boş YA DA hiçbir üründe yok → yeni ürün.
      if v_name is null then
        v_skipped := v_skipped + 1;
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
      v_updated := v_updated + 1;
    end if;

    insert into public.retailer_stock (retailer_org_id, product_id, quantity)
    values (v_me, v_product_id, v_quantity)
    on conflict (retailer_org_id, product_id)
      do update set quantity = excluded.quantity, updated_at = now();
  end loop;

  return jsonb_build_object('updated', v_updated, 'created', v_created, 'skipped', v_skipped);
end;
$$;

grant execute on function public.bulk_update_retailer_stock(jsonb, uuid) to authenticated;

notify pgrst, 'reload schema';
