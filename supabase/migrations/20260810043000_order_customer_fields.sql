-- KÖPRÜ — Müşteri İletişim ve Konum Bilgileri
-- orders tablosuna e-posta, il ve ilçe alanlarını ekler.
-- place_order_atomic RPC'sini bu alanları destekleyecek şekilde günceller.

alter table public.orders
  add column if not exists customer_email text,
  add column if not exists customer_province text,
  add column if not exists customer_district text;

create or replace function public.place_order_atomic(
  p_relationship_id uuid,
  p_items jsonb,
  p_customer jsonb default '{}'::jsonb
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
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty numeric(14,3);
  v_unit numeric(14,2);
  v_line numeric(14,2);
  v_total numeric(14,2) := 0;
  v_item_id uuid;
  v_retail numeric(14,2);
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

  -- Sipariş yönü TEK: yalnız perakendeci, üreticiye sipariş verir.
  if v_rel.retailer_org_id <> v_me then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.orders (
    order_no, relationship_id, manufacturer_org_id, retailer_org_id, status,
    customer_name, customer_phone, customer_email, customer_province, customer_district, customer_address, note
  ) values (
    public.next_order_no(v_rel.manufacturer_org_id),
    p_relationship_id, v_rel.manufacturer_org_id, v_rel.retailer_org_id, 'pending',
    nullif(p_customer->>'name', ''), nullif(p_customer->>'phone', ''),
    nullif(p_customer->>'email', ''), nullif(p_customer->>'province', ''), nullif(p_customer->>'district', ''),
    nullif(p_customer->>'address', ''), nullif(p_customer->>'note', '')
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

    -- KATMAN 2: iskonto BURADA uygulanır, nihai net fiyat saklanır.
    v_unit := round(v_product.supplier_price * (1 - v_rel.discount_rate / 100.0), 2);
    v_line := round(v_unit * v_qty, 2);
    v_total := v_total + v_line;

    -- Snapshot ALLOWLIST ile kurulur; to_jsonb(v_product) YAZILMAZ.
    insert into public.order_items (
      order_id, product_id, quantity, supplier_unit_price, total_price, product_snapshot
    ) values (
      v_order_id, v_product.id, v_qty, v_unit, v_line,
      jsonb_build_object(
        'name', v_product.name,
        'code', v_product.code,
        'currency', v_product.currency,
        'type', v_product.type,
        'images', to_jsonb(v_product.images)
      )
    )
    returning id into v_item_id;

    -- KATMAN 3: perakendecinin satış fiyatı AYRI tabloya. Üretici göremez.
    v_retail := nullif(v_item->>'retail_unit_price', '')::numeric;
    if v_retail is not null then
      insert into public.order_item_retail_prices (order_item_id, retailer_org_id, retail_unit_price)
      values (v_item_id, v_rel.retailer_org_id, v_retail);
    end if;

    -- Stok: sipariş anında düşer.
    insert into public.manufacturer_stock (owner_org_id, product_id, quantity)
    values (v_rel.manufacturer_org_id, v_product.id, -v_qty)
    on conflict (owner_org_id, product_id)
      do update set quantity = public.manufacturer_stock.quantity - v_qty,
                    updated_at = now();

    v_snapshot := v_snapshot || jsonb_build_object(
      'name', v_product.name, 'code', v_product.code,
      'quantity', v_qty, 'unit_price', v_unit, 'total', v_line
    );
  end loop;

  update public.orders set total_amount = v_total where id = v_order_id;

  -- --- CARİ: kök siparişin İLK debit kaydı.
  select t.balance_after into v_prev
    from public.transactions t
   where t.relationship_id = p_relationship_id
   order by t.created_at desc, t.id desc
   limit 1
     for update;

  insert into public.transactions (
    relationship_id, manufacturer_org_id, retailer_org_id, type, amount,
    balance_after, order_id, description, items_snapshot
  ) values (
    p_relationship_id, v_rel.manufacturer_org_id, v_rel.retailer_org_id, 'debit', v_total,
    coalesce(v_prev, 0) + v_total, v_order_id,
    'Sipariş', v_snapshot
  );

  insert into public.order_status_logs (order_id, from_status, to_status, actor_user_id, actor_org_id)
  values (v_order_id, null, 'pending', public.get_my_user_id(), v_me);

  return v_order_id;
end;
$$;

notify pgrst, 'reload schema';
