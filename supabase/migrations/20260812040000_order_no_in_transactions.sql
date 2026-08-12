-- Cari işlemlerde sipariş numarasının açıklamaya dahil edilmesi.

-- 1. place_order_atomic: Sipariş oluşturulurken açıklamaya sipariş no yazılır.
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
  v_order_no text;
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

  if v_rel.retailer_org_id <> v_me then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_order_no := public.next_order_no(v_rel.manufacturer_org_id);

  insert into public.orders (
    order_no, relationship_id, manufacturer_org_id, retailer_org_id, status,
    customer_name, customer_phone, customer_email, customer_province, customer_district, customer_address, note
  ) values (
    v_order_no,
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

    v_unit := round(v_product.supplier_price * (1 - v_rel.discount_rate / 100.0), 2);
    v_line := round(v_unit * v_qty, 2);
    v_total := v_total + v_line;

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

    v_snapshot := v_snapshot || jsonb_build_object(
      'name', v_product.name, 'code', v_product.code,
      'quantity', v_qty, 'unit_price', v_unit, 'total', v_line
    );
  end loop;

  update public.orders set total_amount = v_total where id = v_order_id;

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
    'Sipariş #' || v_order_no, v_snapshot
  );

  insert into public.order_status_logs (order_id, from_status, to_status, actor_user_id, actor_org_id)
  values (v_order_id, null, 'pending', public.get_my_user_id(), v_me);

  return v_order_id;
end;
$$;

-- 2. cancel_order_atomic: İptal açıklamasında sipariş no yer alır.
create or replace function public.cancel_order_atomic(
  p_order_id uuid,
  p_reason text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_order public.orders%rowtype;
  v_prev numeric(14,2);
  v_item record;
  v_from public.order_status;
  v_desc text;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  v_from := v_order.status;
  if v_me not in (v_order.manufacturer_org_id, v_order.retailer_org_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_order.status in ('cancelled', 'returned', 'delivered') then
    raise exception 'ORDER_CLOSED' using errcode = '22023';
  end if;

  for v_item in select product_id, quantity from public.order_items where order_id = p_order_id loop
    if v_item.product_id is not null then
      update public.manufacturer_stock
         set quantity = quantity + v_item.quantity, updated_at = now()
       where owner_org_id = v_order.manufacturer_org_id and product_id = v_item.product_id;
    end if;
  end loop;

  select t.balance_after into v_prev
    from public.transactions t
   where t.relationship_id = v_order.relationship_id
   order by t.created_at desc, t.id desc
   limit 1
     for update;

  v_desc := 'Sipariş iptali: #' || v_order.order_no;
  if p_reason is not null and length(trim(p_reason)) > 0 then
    v_desc := v_desc || ' (' || trim(p_reason) || ')';
  end if;

  insert into public.transactions (
    relationship_id, manufacturer_org_id, retailer_org_id, type, amount,
    balance_after, order_id, description
  ) values (
    v_order.relationship_id, v_order.manufacturer_org_id, v_order.retailer_org_id,
    'credit', v_order.total_amount,
    coalesce(v_prev, 0) - v_order.total_amount, p_order_id,
    v_desc
  );

  update public.orders set status = 'cancelled' where id = p_order_id
  returning * into v_order;

  insert into public.order_status_logs (order_id, from_status, to_status, actor_user_id, actor_org_id, note)
  values (p_order_id, v_from, 'cancelled', public.get_my_user_id(), v_me, p_reason);

  return v_order;
end;
$$;

-- 3. approve_return_request: İade açıklamasında sipariş no yer alır.
create or replace function public.approve_return_request(
  p_return_id uuid,
  p_note text default null
)
returns public.return_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_req public.return_requests%rowtype;
  v_order public.orders%rowtype;
  v_prev numeric(14,2);
  v_amount numeric(14,2);
  v_item record;
  v_desc text;
begin
  select * into v_req from public.return_requests where id = p_return_id for update;
  if not found then
    raise exception 'RETURN_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'RETURN_CLOSED' using errcode = '22023';
  end if;

  select * into v_order from public.orders where id = v_req.order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_me <> v_req.manufacturer_org_id then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_amount := v_order.total_amount;

  for v_item in select product_id, quantity from public.order_items where order_id = v_req.order_id loop
    if v_item.product_id is not null then
      update public.manufacturer_stock
         set quantity = quantity + v_item.quantity, updated_at = now()
       where owner_org_id = v_req.manufacturer_org_id and product_id = v_item.product_id;
    end if;
  end loop;

  select t.balance_after into v_prev
    from public.transactions t
   where t.relationship_id = v_req.relationship_id
   order by t.created_at desc, t.id desc
   limit 1
     for update;

  v_desc := 'Sipariş iadesi: #' || v_order.order_no;
  if p_note is not null and length(trim(p_note)) > 0 then
    v_desc := v_desc || ' (' || trim(p_note) || ')';
  end if;

  insert into public.transactions (
    relationship_id, manufacturer_org_id, retailer_org_id, type, amount,
    balance_after, order_id, description
  ) values (
    v_req.relationship_id, v_req.manufacturer_org_id, v_req.retailer_org_id,
    'credit', v_amount, coalesce(v_prev, 0) - v_amount, v_req.order_id,
    v_desc
  );

  update public.return_requests
     set status = 'approved', approved_amount = v_amount,
         decided_at = now(), decided_by = public.get_my_user_id()
   where id = p_return_id
  returning * into v_req;

  update public.orders set status = 'returned'::public.order_status
   where id = v_req.order_id;

  insert into public.order_status_logs (order_id, from_status, to_status, actor_user_id, actor_org_id, note)
  values (v_req.order_id, 'delivered', 'returned', public.get_my_user_id(), v_me, p_note);

  return v_req;
end;
$$;

-- 4. Mevcut kayıtlarda eksik sipariş numaralarını açıklamalara ekle.
update public.transactions t
set description = case 
  when t.description = 'Sipariş' then 'Sipariş #' || o.order_no
  when t.description like 'Sipariş iptali%' and t.description not like '%' || o.order_no || '%' then 
    'Sipariş iptali: #' || o.order_no || case 
      when length(trim(replace(t.description, 'Sipariş iptali:', ''))) > 0 
      then ' (' || trim(replace(t.description, 'Sipariş iptali:', '')) || ')' 
      else '' 
    end
  when t.description like 'İade%' and t.description not like '%' || o.order_no || '%' then
    'Sipariş iadesi: #' || o.order_no || case 
      when length(trim(replace(t.description, 'İade:', ''))) > 0 
      then ' (' || trim(replace(t.description, 'İade:', '')) || ')' 
      else '' 
    end
  else t.description || ' (#' || o.order_no || ')'
end
from public.orders o
where t.order_id = o.id
  and t.order_id is not null
  and t.description not like '%' || o.order_no || '%';
