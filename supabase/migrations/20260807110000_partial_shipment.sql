-- KÖPRÜ — Faz 6c: kısmi sevkiyat
--
-- CARİ DEFTERE DOKUNULMAZ. Borç, sipariş anında TAM tutardan yazıldı; sevkiyat
-- yalnızca o siparişi parçalara böler. Kök + çocukların toplamı her zaman
-- ilk tutara eşit kalır, dolayısıyla defterin düzeltilmesi gerekmez.
--
-- Bu, her iki eski projenin de kilitli kuralıydı ve korunuyor:
-- "Kısmi sevkiyat transactions'a dokunmaz."

drop function if exists public.ship_order_atomic(uuid, jsonb);

create or replace function public.ship_order_atomic(
  p_order_id uuid,
  -- [{order_item_id, quantity}] · null veya boş = TAMAMINI sevk et
  p_items jsonb default null
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
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  v_from := v_order.status;

  -- Sevkiyat üreticinin işidir.
  if v_order.manufacturer_org_id <> v_me then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_order.status in ('cancelled', 'returned', 'delivered', 'shipped') then
    raise exception 'ORDER_CLOSED' using errcode = '22023';
  end if;

  -- --- TAM SEVKİYAT: parçalamaya gerek yok, kökün durumu değişir.
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    update public.orders set status = 'shipped' where id = p_order_id;
    insert into public.order_status_logs (order_id, from_status, to_status, actor_user_id, actor_org_id)
    values (p_order_id, v_from, 'shipped', public.get_my_user_id(), v_me);
    return p_order_id;
  end if;

  -- --- KISMİ SEVKİYAT: çocuk sipariş oluşur, kökten düşülür.
  -- Çocuk sayısı DB'den anlık okunur; yerel sayaçtan hesaplamak yarış üretir.
  select count(*) into v_child_count from public.orders where parent_order_id = p_order_id;
  v_child_no := v_order.order_no || '/' || (v_child_count + 1)::text;

  insert into public.orders (
    order_no, relationship_id, manufacturer_org_id, retailer_org_id, status,
    parent_order_id, total_amount, customer_name, customer_phone, customer_address
  ) values (
    v_child_no, v_order.relationship_id, v_order.manufacturer_org_id, v_order.retailer_org_id,
    'shipped', p_order_id, 0,
    v_order.customer_name, v_order.customer_phone, v_order.customer_address
  )
  returning id into v_child_id;

  for v_req in select * from jsonb_array_elements(p_items) loop
    select * into v_item from public.order_items
     where id = (v_req->>'order_item_id')::uuid and order_id = p_order_id
     for update;
    if not found then
      raise exception 'ITEM_NOT_FOUND' using errcode = 'P0002';
    end if;

    v_qty := (v_req->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'INVALID_QUANTITY' using errcode = '22023';
    end if;
    -- Kökün `quantity` alanı HER ZAMAN kalan miktardır; ayrıca "sevk edilen"
    -- toplamı tutulmaz. Bu yüzden kontrol doğrudan onunla yapılır.
    if v_qty > v_item.quantity then
      raise exception 'QUANTITY_EXCEEDS_REMAINING' using errcode = '22023';
    end if;

    v_line := round(v_item.supplier_unit_price * v_qty, 2);
    v_child_total := v_child_total + v_line;

    insert into public.order_items (
      order_id, product_id, quantity, supplier_unit_price, total_price, product_snapshot
    ) values (
      v_child_id, v_item.product_id, v_qty, v_item.supplier_unit_price, v_line,
      v_item.product_snapshot
    )
    returning id into v_new_item_id;

    -- KATMAN 3: perakendecinin satış fiyatı çocuğa TAŞINIR. Üretici bu değeri
    -- görmez; kopyalama tümüyle sunucu içinde olur.
    select r.retail_unit_price into v_retail
      from public.order_item_retail_prices r
     where r.order_item_id = v_item.id;
    if v_retail is not null then
      insert into public.order_item_retail_prices (order_item_id, retailer_org_id, retail_unit_price)
      values (v_new_item_id, v_order.retailer_org_id, v_retail);
    end if;

    -- Kökten düş: kalan sıfırsa satır kalkar.
    if v_item.quantity - v_qty = 0 then
      delete from public.order_items where id = v_item.id;
    else
      update public.order_items
         set quantity = v_item.quantity - v_qty,
             total_price = round(v_item.supplier_unit_price * (v_item.quantity - v_qty), 2)
       where id = v_item.id;
    end if;
  end loop;

  update public.orders set total_amount = v_child_total where id = v_child_id;

  -- Kökün tutarı düşer; kök + çocuklar toplamı sabit kalır, defter bozulmaz.
  update public.orders
     set total_amount = greatest(v_order.total_amount - v_child_total, 0)
   where id = p_order_id;

  -- Kökte kalem kalmadıysa sevkiyat tamamlanmıştır.
  select coalesce(sum(quantity), 0) into v_remaining
    from public.order_items where order_id = p_order_id;

  update public.orders
     set status = case when v_remaining = 0 then 'shipped' else 'partially_shipped' end
   where id = p_order_id;

  insert into public.order_status_logs (order_id, from_status, to_status, actor_user_id, actor_org_id, note)
  values (
    p_order_id, v_from,
    case when v_remaining = 0 then 'shipped' else 'partially_shipped' end,
    public.get_my_user_id(), v_me, 'Sevkiyat: ' || v_child_no
  );

  return v_child_id;
end;
$$;

notify pgrst, 'reload schema';
