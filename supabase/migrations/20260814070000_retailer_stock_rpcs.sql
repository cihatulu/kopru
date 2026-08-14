-- KÖPRÜ — Perakendeci kendi deposunun adedini yönetebiliyor
--
-- `retailer_stock` tablosu ve SELECT politikası vardı; katalogdaki "BENDE: n"
-- rozeti bunu okuyor. Ama YAZAN hiçbir yol yoktu: tabloda INSERT/UPDATE
-- politikası yok, RPC de yok. Perakendeci kendi stoğunu görüyor ama hiçbir
-- yerden değiştiremiyordu.
--
-- KURAL 14: istemci stok tablolarına ASLA doğrudan yazmaz. Sipariş dışı
-- düzeltmenin meşru yolu bu RPC'lerdir; `set_product_stock`'un perakendeci
-- karşılığıdır ve aynı deseni izler.
--
-- ÜRÜN YARATMAZ. Eski retailer-platform'da "stok ekle" serbest metinle üretici
-- ve ürün yaratıyordu (`add_or_update_product_stock`); orada tenant
-- perakendeciydi ve ürünler onun alt kaydıydı. KÖPRÜ'de ürün ÜRETİCİNİNDİR;
-- perakendeci ürün ekleyecekse bunu `can_edit_catalog` izniyle Ürün Yönetimi
-- ekranından yapar. Burada yalnız ADET yazılır.
--
-- KAPSAM: yalnız TEDARİKÇİSİ OLDUĞU üreticilerin ürünleri. Perakendeci
-- ilişkisi olmayan bir üreticinin ürününe stok giremez — girebilseydi katalog
-- dışı ürün kimliği deneyerek başka üreticilerin ürün kimliklerini
-- doğrulayabilirdi.

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
  if p_quantity is null or p_quantity < 0 then
    raise exception 'INVALID_QUANTITY' using errcode = '22023';
  end if;

  -- Ürün, aktif bir tedarikçi ilişkisinin üreticisine ait olmalı (A9: denormalize
  -- kolonlar üzerinden eşitlik, `relationship_id IN (...)` deseni yok).
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

-- ============================================================ toplu güncelleme
-- CSV içe aktarımı. Tek transaction: yarım güncelleme olmaz.
-- Yabancı ürün kimlikleri SESSİZCE ATLANIR ve dönen sayı GERÇEKTEN işlenen
-- satır sayısıdır — kullanıcıya "gönderdiğin satır" değil, "yazılan satır"
-- gösterilir. Tek bir hatalı satır yüzünden 500 satırlık dosya reddedilmez.

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
