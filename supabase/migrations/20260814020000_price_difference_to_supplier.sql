-- KÖPRÜ — Özel talep fiyat farkı üreticinin tarafına geçiyor
--
-- DÜN VERİLEN KARAR TERSİNE ÇEVRİLİYOR. `20260814010000` fiyat farkını yalnız
-- KATMAN 3'e yazıyordu; gerekçe, istemciden gelen bir tutarın cariye
-- girmemesiydi (A5).
--
-- İş gerçeği farklıymış: "kapılar cam olsun" işini ÜRETİCİ yapar ve ek ücreti
-- üretici ister. Perakendeci o parayı üreticiye öder, kendi müşterisinden de
-- tahsil eder. Dolayısıyla fark KATMAN 2'ye aittir ve cariye girmelidir.
--
-- A5 İLE ÇELİŞMEZ, ÇÜNKÜ:
--   · İskonto ve birim fiyat hâlâ sunucuda `relationships.discount_rate`'ten
--     hesaplanır; istemcinin gönderdiği FİYATA bakılmaz. Değişen yalnız,
--     üzerine eklenen pazarlıklı ek ücret.
--   · Fark borcu ARTIRIR. Perakendeci kendi lehine oynayamaz; düşük gönderirse
--     kendi borcunu eksik yazmış olur ve üretici siparişi onaylamaz.
--   · Sipariş `pending` doğar. Üretici talebi ve farkı görüp onaylar; kabul
--     etmezse iptal akışı dengeleyici kayıt yazar (A8).
--
-- Negatif değere izin verilir: fark bir indirim de olabilir.

alter table public.order_items
  add column if not exists price_difference numeric(14,2) not null default 0;

comment on column public.order_items.price_difference is
  'Özel talep için üreticinin istediği birim ek ücret (eksi ise indirim). KATMAN 2.';

-- Dünkü iki test kaydındaki değer kaybolmasın diye taşınır. TOPLAMLAR VE
-- CARİ DEĞİŞTİRİLMEZ (kural 7): geçmiş yeniden yazılmaz, o siparişler kendi
-- anlarındaki tutarlarla kalır.
update public.order_items oi
   set price_difference = rp.price_difference
  from public.order_item_retail_prices rp
 where rp.order_item_id = oi.id
   and rp.price_difference <> 0;

alter table public.order_item_retail_prices
  drop column if exists price_difference;

comment on column public.order_item_retail_prices.retail_unit_price is
  'Perakendecinin müşterisine uyguladığı birim fiyat (fark dahil). KATMAN 3.';

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
    v_diff := round(coalesce(nullif(v_item->>'price_difference', '')::numeric, 0), 2);

    -- İskontoyu ÜRETİCİ belirler (A5); istemcinin gönderdiği fiyata bakılmaz.
    v_unit := round(v_product.supplier_price * (1 - v_rel.discount_rate / 100.0), 2);

    -- Özel talep ek ücreti üreticiye aittir: satır toplamına ve cariye girer.
    -- Ek ücret birim başınadır; iki camlı kapak iki kat işçiliktir.
    v_line := round((v_unit + v_diff) * v_qty, 2);
    if v_line < 0 then
      raise exception 'NEGATIVE_LINE_TOTAL' using errcode = '22023';
    end if;
    v_total := v_total + v_line;

    insert into public.order_items (
      order_id, product_id, quantity, supplier_unit_price, total_price,
      product_snapshot, custom_description, price_difference
    ) values (
      v_order_id, v_product.id, v_qty, v_unit, v_line,
      jsonb_build_object(
        'name', v_product.name,
        'code', v_product.code,
        'currency', v_product.currency,
        'type', v_product.type,
        'images', to_jsonb(v_product.images)
      ),
      v_custom, v_diff
    )
    returning id into v_item_id;

    -- KATMAN 3 ayrı tabloda: üretici perakendecinin satış fiyatını görmez (A4).
    v_retail := nullif(v_item->>'retail_unit_price', '')::numeric;
    if v_retail is not null then
      insert into public.order_item_retail_prices (order_item_id, retailer_org_id, retail_unit_price)
      values (v_item_id, v_rel.retailer_org_id, v_retail);
    end if;

    insert into public.manufacturer_stock (owner_org_id, product_id, quantity)
    values (v_rel.manufacturer_org_id, v_product.id, -v_qty)
    on conflict (owner_org_id, product_id)
      do update set quantity = public.manufacturer_stock.quantity - v_qty,
                    updated_at = now();

    -- Cari ekstre kırılımı: fark ayrı yazılır ki "neden bu tutar" sorusu
    -- detayda yanıtlansın.
    v_snapshot := v_snapshot || jsonb_build_object(
      'name', v_product.name, 'code', v_product.code,
      'quantity', v_qty, 'unit_price', v_unit, 'total', v_line,
      'custom_description', v_custom,
      'price_difference', v_diff
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
-- Çocuk satırın tutarı da farkı içermeli; aksi halde kısmi sevkiyatta ek ücret
-- kökten düşer ama çocuğa binmez ve toplam borç kendiliğinden azalırdı.

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

    v_line := round((v_item.supplier_unit_price + v_item.price_difference) * v_qty, 2);
    v_child_total := v_child_total + v_line;

    insert into public.order_items (order_id, product_id, quantity, supplier_unit_price, total_price, product_snapshot, custom_description, price_difference)
    values (v_child_id, v_item.product_id, v_qty, v_item.supplier_unit_price, v_line, v_item.product_snapshot, v_item.custom_description, v_item.price_difference)
    returning id into v_new_item_id;

    select r.retail_unit_price into v_retail
      from public.order_item_retail_prices r where r.order_item_id = v_item.id;
    if v_retail is not null then
      insert into public.order_item_retail_prices (order_item_id, retailer_org_id, retail_unit_price)
      values (v_new_item_id, v_order.retailer_org_id, v_retail);
    end if;

    if v_item.quantity - v_qty = 0 then delete from public.order_items where id = v_item.id;
    else update public.order_items
            set quantity = v_item.quantity - v_qty,
                total_price = round((v_item.supplier_unit_price + v_item.price_difference) * (v_item.quantity - v_qty), 2)
          where id = v_item.id;
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

notify pgrst, 'reload schema';
