-- KÖPRÜ — Müşteri değişiklik talebi ve fiyat farkı siparişe yazılıyor
--
-- Sepet ekranı "MÜŞTERİ DEĞİŞİKLİK TALEBİ" (açıklama + fiyat farkı) topluyor ve
-- `place_order_atomic`'e gönderiyordu; RPC bu iki alanı OKUMUYORDU ve karşılık
-- gelen kolon da yoktu. Kullanıcının yazdığı "kapılar cam olsun" siparişe hiç
-- ulaşmıyor, sessizce kayboluyordu.
--
-- İKİ ALAN İKİ AYRI KATMANA GİDER (A4):
--
--   · custom_description → `order_items`. Bu bir ÜRETİM TALİMATIDIR; üretici
--     görmezse iş yapılamaz. Fiyat bilgisi taşımadığı için ortak tabloda
--     durması sızıntı değildir.
--
--   · price_difference → `order_item_retail_prices`. Perakendecinin özel talep
--     için KENDİ müşterisinden aldığı ek ücrettir (KATMAN 3); üretici görmez.
--     `order_items`'a fiyat farkı kolonu EKLENMEZ (kural 5).
--
-- NEDEN ÜRETİCİ FİYATINA EKLENMİYOR: iskontoyu ve satış fiyatını üretici
-- belirler (A5); `place_order_atomic` istemcinin gönderdiği tutara bakmaz.
-- İstemcinin yazdığı bir farkı KATMAN 2'ye eklemek bu kilidi delerdi.
-- Üreticinin özel talep için isteyeceği ek ücret ayrı bir pazarlıktır ve
-- cari üzerinden işlenir.
--
-- `retail_unit_price` HER ŞEY DAHİL birim fiyattır (taban + fark).
-- `price_difference` bunun ne kadarının özel talepten geldiğini kaydeder.
-- Böylece bu tabloyu okuyan beş ayrı yer (müşteri carisi, perakendeci raporu,
-- sipariş listesi, sipariş detayı, takip sayfası) değişmeden doğru kalır;
-- kırılım da kaybolmaz.
--
-- İmzalar değişmiyor; `create or replace` yeterli (kural 6).

alter table public.order_items
  add column if not exists custom_description text;

alter table public.order_item_retail_prices
  add column if not exists price_difference numeric(14,2) not null default 0;

comment on column public.order_items.custom_description is
  'Müşterinin değişiklik talebi — üretim talimatı, her iki taraf görür.';
comment on column public.order_item_retail_prices.retail_unit_price is
  'HER ŞEY DAHİL perakende birim fiyat (taban + özel talep farkı).';
comment on column public.order_item_retail_prices.price_difference is
  'retail_unit_price içindeki özel talep farkı — yalnız kırılım için.';

-- ============================================================ sipariş oluşturma

create or replace function public.place_order_atomic(
  p_relationship_id uuid,
  p_items jsonb,
  p_customer jsonb default '{}'::jsonb,
  p_salesperson_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_rel public.relationships%rowtype;
  v_order_id uuid;
  v_order_no text;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty numeric(14,3);
  v_unit numeric(14,2);
  v_line numeric(14,2);
  v_total numeric(14,2) := 0;
  v_item_id uuid;
  v_retail numeric(14,2);
  v_diff numeric(14,2);
  v_custom text;
  v_prev numeric(14,2);
  v_snapshot jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_ORDER' using errcode = '22023';
  end if;

  select * into v_rel from public.relationships
   where id = p_relationship_id and status = 'active';
  if not found then
    raise exception 'NO_ACTIVE_RELATIONSHIP' using errcode = '42501';
  end if;

  if v_rel.retailer_org_id <> v_me then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Satışçı zorunlu ve YALNIZ kendi ekibinden olabilir: başka bir orgun
  -- personeli seçilerek rapor kirletilemez.
  if p_salesperson_user_id is null then
    raise exception 'SALESPERSON_REQUIRED' using errcode = '22023';
  end if;
  perform 1 from public.users u
    where u.id = p_salesperson_user_id and u.org_id = v_me and u.is_active;
  if not found then
    raise exception 'INVALID_SALESPERSON' using errcode = '22023';
  end if;

  v_order_no := public.next_order_no(v_rel.manufacturer_org_id);

  insert into public.orders (
    order_no, relationship_id, manufacturer_org_id, retailer_org_id, status,
    salesperson_user_id,
    customer_name, customer_phone, customer_email, customer_province,
    customer_district, customer_address, note
  ) values (
    v_order_no,
    p_relationship_id, v_rel.manufacturer_org_id, v_rel.retailer_org_id, 'pending',
    p_salesperson_user_id,
    nullif(p_customer->>'name', ''), nullif(p_customer->>'phone', ''),
    nullif(p_customer->>'email', ''), nullif(p_customer->>'province', ''),
    nullif(p_customer->>'district', ''), nullif(p_customer->>'address', ''),
    nullif(p_customer->>'note', '')
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from public.products
     where id = (v_item->>'product_id')::uuid
       and owner_org_id = v_rel.manufacturer_org_id
       and is_active;
    if not found then
      raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
    end if;

    v_qty := (v_item->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'INVALID_QUANTITY' using errcode = '22023';
    end if;

    v_custom := nullif(btrim(coalesce(v_item->>'custom_description', '')), '');
    v_diff := coalesce(nullif(v_item->>'price_difference', '')::numeric, 0);

    -- İskontoyu ÜRETİCİ belirler (A5); istemcinin gönderdiği fiyata bakılmaz.
    v_unit := round(v_product.supplier_price * (1 - v_rel.discount_rate / 100.0), 2);
    v_line := round(v_unit * v_qty, 2);
    v_total := v_total + v_line;

    insert into public.order_items (
      order_id, product_id, quantity, supplier_unit_price, total_price,
      product_snapshot, custom_description
    ) values (
      v_order_id, v_product.id, v_qty, v_unit, v_line,
      jsonb_build_object(
        'name', v_product.name,
        'code', v_product.code,
        'currency', v_product.currency,
        'type', v_product.type,
        'images', to_jsonb(v_product.images)
      ),
      v_custom
    )
    returning id into v_item_id;

    -- KATMAN 3 ayrı tabloda: üretici perakendecinin satış fiyatını görmez (A4).
    -- Fiyat farkı yalnız BU tarafı etkiler; kaydedilen fiyat her şey dahildir.
    v_retail := nullif(v_item->>'retail_unit_price', '')::numeric;
    if v_retail is not null or v_diff <> 0 then
      insert into public.order_item_retail_prices (
        order_item_id, retailer_org_id, retail_unit_price, price_difference
      )
      values (v_item_id, v_rel.retailer_org_id, coalesce(v_retail, 0) + v_diff, v_diff);
    end if;

    insert into public.manufacturer_stock (owner_org_id, product_id, quantity)
    values (v_rel.manufacturer_org_id, v_product.id, -v_qty)
    on conflict (owner_org_id, product_id)
      do update set quantity = public.manufacturer_stock.quantity - v_qty,
                    updated_at = now();

    -- Cari ekstre kırılımı KATMAN 2'dir; talep metni fiyat taşımaz, eklenebilir.
    v_snapshot := v_snapshot || jsonb_build_object(
      'name', v_product.name, 'code', v_product.code,
      'quantity', v_qty, 'unit_price', v_unit, 'total', v_line,
      'custom_description', v_custom
    );
  end loop;

  update public.orders set total_amount = v_total where id = v_order_id;

  -- Önceki satırı kilitle ki eşzamanlı iki sipariş aynı bakiyeyi yarıştırmasın (A18).
  select t.balance_after into v_prev
    from public.transactions t
   where t.relationship_id = p_relationship_id
   order by t.created_at desc, t.id desc
   limit 1
     for update;

  -- Kök siparişin İLK debit kaydı. Bu satıra bir daha DOKUNULMAZ (A8).
  insert into public.transactions (
    relationship_id, manufacturer_org_id, retailer_org_id, type, amount,
    balance_after, order_id, description, items_snapshot
  ) values (
    p_relationship_id, v_rel.manufacturer_org_id, v_rel.retailer_org_id, 'debit', v_total,
    coalesce(v_prev, 0) + v_total, v_order_id,
    'Sipariş #' || v_order_no, v_snapshot
  );

  insert into public.order_status_logs (order_id, from_status, to_status, actor_user_id, actor_org_id)
  values (v_order_id, null, 'pending', public.get_my_user_id(), v_me);

  return v_order_id;
end;
$$;

grant execute on function public.place_order_atomic(uuid, jsonb, jsonb, uuid) to authenticated;

-- ============================================================ kısmi sevkiyat
-- Çocuk sipariş kalemi kökün kopyasıdır: talep metni ve fiyat farkı da taşınır,
-- aksi halde sevk edilen parçada özel talep kayboluyordu.

create or replace function public.ship_order_atomic(
  p_order_id uuid,
  p_items jsonb default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_order public.orders%rowtype;
  v_from public.order_status;
  v_to public.order_status;
  v_child_id uuid;
  v_child_no text;
  v_child_count int;
  v_req jsonb;
  v_item public.order_items%rowtype;
  v_qty numeric(14,3);
  v_line numeric(14,2);
  v_child_total numeric(14,2) := 0;
  v_new_item_id uuid;
  v_retail numeric(14,2);
  v_diff numeric(14,2);
  v_remaining numeric(14,3);
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002'; end if;
  v_from := v_order.status;
  if v_order.manufacturer_org_id <> v_me then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if v_order.status in ('cancelled', 'returned', 'delivered', 'shipped') then raise exception 'ORDER_CLOSED' using errcode = '22023'; end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    update public.orders set status = 'shipped'::public.order_status where id = p_order_id;
    insert into public.order_status_logs (order_id, from_status, to_status, actor_user_id, actor_org_id, note)
    values (p_order_id, v_from, 'shipped'::public.order_status, public.get_my_user_id(), v_me, p_note);
    return p_order_id;
  end if;

  select count(*) into v_child_count from public.orders where parent_order_id = p_order_id;
  v_child_no := v_order.order_no || '/' || (v_child_count + 1)::text;

  insert into public.orders (order_no, relationship_id, manufacturer_org_id, retailer_org_id, status, parent_order_id, total_amount, customer_name, customer_phone, customer_address)
  values (v_child_no, v_order.relationship_id, v_order.manufacturer_org_id, v_order.retailer_org_id, 'shipped'::public.order_status, p_order_id, 0, v_order.customer_name, v_order.customer_phone, v_order.customer_address)
  returning id into v_child_id;

  for v_req in select * from jsonb_array_elements(p_items) loop
    select * into v_item from public.order_items where id = (v_req->>'order_item_id')::uuid and order_id = p_order_id for update;
    if not found then raise exception 'ITEM_NOT_FOUND' using errcode = 'P0002'; end if;
    v_qty := (v_req->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then raise exception 'INVALID_QUANTITY' using errcode = '22023'; end if;
    if v_qty > v_item.quantity then raise exception 'QUANTITY_EXCEEDS_REMAINING' using errcode = '22023'; end if;

    v_line := round(v_item.supplier_unit_price * v_qty, 2);
    v_child_total := v_child_total + v_line;

    insert into public.order_items (order_id, product_id, quantity, supplier_unit_price, total_price, product_snapshot, custom_description)
    values (v_child_id, v_item.product_id, v_qty, v_item.supplier_unit_price, v_line, v_item.product_snapshot, v_item.custom_description)
    returning id into v_new_item_id;

    select r.retail_unit_price, r.price_difference into v_retail, v_diff
      from public.order_item_retail_prices r where r.order_item_id = v_item.id;
    if v_retail is not null then
      insert into public.order_item_retail_prices (order_item_id, retailer_org_id, retail_unit_price, price_difference)
      values (v_new_item_id, v_order.retailer_org_id, v_retail, coalesce(v_diff, 0));
    end if;

    if v_item.quantity - v_qty = 0 then delete from public.order_items where id = v_item.id;
    else update public.order_items set quantity = v_item.quantity - v_qty, total_price = round(v_item.supplier_unit_price * (v_item.quantity - v_qty), 2) where id = v_item.id;
    end if;
  end loop;

  update public.orders set total_amount = v_child_total where id = v_child_id;
  update public.orders set total_amount = greatest(v_order.total_amount - v_child_total, 0) where id = p_order_id;
  select coalesce(sum(quantity), 0) into v_remaining from public.order_items where order_id = p_order_id;
  v_to := case when v_remaining = 0 then 'shipped'::public.order_status else 'partially_shipped'::public.order_status end;
  update public.orders set status = v_to where id = p_order_id;
  insert into public.order_status_logs (order_id, from_status, to_status, actor_user_id, actor_org_id, note)
  values (p_order_id, v_from, v_to, public.get_my_user_id(), v_me, coalesce(p_note, 'Sevkiyat: ' || v_child_no));
  return v_child_id;
end;
$$;

grant execute on function public.ship_order_atomic(uuid, jsonb, text) to authenticated;

-- ============================================================ takip sayfası
-- Müşteri kendi talebini takip linkinde görebilmeli.

create or replace function public.track_order_items(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'productId', oi.product_id,
      'name', oi.product_snapshot->>'name',
      'quantity', oi.quantity,
      'unit_price', coalesce(rp.retail_unit_price, 0),
      'total_price', round(coalesce(rp.retail_unit_price, 0) * oi.quantity, 2),
      'custom_description', oi.custom_description
    )
  ), '[]'::jsonb)
  from public.order_items oi
  left join public.order_item_retail_prices rp on rp.order_item_id = oi.id
  where oi.order_id = p_order_id;
$$;

grant execute on function public.track_order_items(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
