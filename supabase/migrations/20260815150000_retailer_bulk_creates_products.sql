-- KÖPRÜ — Perakendeci Excel'den yeni üreticinin tüm ürünlerini açabiliyor
--
-- SENARYO: perakendeci misafir bir üretici açar ve o üreticinin ürünlerini tek
-- tek girmek yerine Excel'den döker. Satırların kimliği yoktur; hepsi seçilen
-- üreticinin kataloğuna PASİF ve fiyatı 0 olarak doğar. Perakendeci sonra Ürün
-- Yönetimi'nden fotoğraf/fiyat ekleyip aktifleştirir.
--
-- HANGİ ÜRETİCİ: dosyada üretici sütunu yok, olamaz da — perakendecinin birden
-- çok tedarikçisi var. Bu yüzden hedef üretici PARAMETRE ile gelir. Seçim
-- yalnız YENİ ürünleri ilgilendirir; kimliği olan satırlar eskisi gibi kendi
-- üreticisine gider.
--
-- YETKİ: `save_product` ile BİREBİR aynı kural — aktif ilişki, izin anahtarı
-- açık (`can_edit_catalog`) ve üretici MİSAFİR (`is_subscriber = false`).
-- İki yol ayrışmasın diye kural kopyalanmadı, aynı üç koşul aynı sırayla
-- uygulanıyor. Üye bir üreticinin kataloğuna perakendeci ürün ekleyemez.
--
-- AYRICA BİR ÜRETİM HATASI DÜZELTİLİYOR:
-- `retailer_stock.retailer_kind` GENERATED ALWAYS kolonudur ama iki RPC de
-- INSERT listesine elle yazıyordu → 428C9. Perakendeci stok yazma yolu bu
-- yüzden HİÇ çalışmamış; `retailer_stock` tablosu bugüne kadar boş kalmış.
-- `products.owner_kind` ile aynı tuzak (bkz. 20260815140000).

-- ============================================================ tekil güncelleme
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

  -- `retailer_kind` YAZILMAZ: üretilmiş kolondur.
  insert into public.retailer_stock (retailer_org_id, product_id, quantity)
  values (v_me, p_product_id, p_quantity)
  on conflict (retailer_org_id, product_id)
    do update set quantity = excluded.quantity, updated_at = now();
end;
$$;

grant execute on function public.set_retailer_stock(uuid, numeric) to authenticated;

-- ============================================================ toplu güncelleme
drop function if exists public.bulk_update_retailer_stock(jsonb);

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
  v_may_create boolean := false;
  v_updated int := 0;
  v_created int := 0;
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

  -- Yetki BİR KEZ, döngüden önce doğrulanır: yüzlerce satırlık dosyada aynı
  -- kontrolü her satırda tekrarlamak boşuna maliyettir.
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

    if v_product_id is null then
      if v_name is null then
        continue;
      end if;
      -- Üretici seçilmemişse yeni ürün açılamaz. Sessizce atlamak yerine
      -- hata veriyoruz: kullanıcı dosyayı yükledi ve hiçbir şey olmadığını
      -- anlamazdı.
      if not v_may_create then
        raise exception 'MANUFACTURER_REQUIRED' using errcode = '22023';
      end if;

      -- `owner_kind` YAZILMAZ: üretilmiş kolondur.
      insert into public.products
        (owner_org_id, name, code, category, supplier_price, is_active)
      values
        (p_manufacturer_org_id, v_name, v_code, v_category, 0, false)
      returning id into v_product_id;

      v_created := v_created + 1;
    else
      -- Yalnız TEDARİKÇİSİ OLUNAN üreticinin ürünü. İlişkisiz bir ürün
      -- kimliğine stok girmek, o kimliğin varlığını doğrulamaya da yarardı.
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

      v_updated := v_updated + 1;
    end if;

    insert into public.retailer_stock (retailer_org_id, product_id, quantity)
    values (v_me, v_product_id, v_quantity)
    on conflict (retailer_org_id, product_id)
      do update set quantity = excluded.quantity, updated_at = now();
  end loop;

  return jsonb_build_object('updated', v_updated, 'created', v_created);
end;
$$;

grant execute on function public.bulk_update_retailer_stock(jsonb, uuid) to authenticated;

notify pgrst, 'reload schema';
