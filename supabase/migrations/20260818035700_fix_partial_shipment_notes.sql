-- Migration: Copy shipment notes to child orders and insert status logs for child orders
--
-- When a partial shipment is done:
-- 1. We copy the shipment note (p_note) to the child order's note column.
-- 2. We insert a status log record for the child order itself (pending -> shipped)
--    so that the shipment card displays its history and notes.

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
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  v_from := v_order.status;

  if v_order.manufacturer_org_id <> v_me then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_order.status in ('cancelled', 'returned', 'delivered', 'shipped') then
    raise exception 'ORDER_CLOSED' using errcode = '22023';
  end if;

  -- --- TAM SEVKİYAT
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    update public.orders set status = 'shipped'::public.order_status where id = p_order_id;
    insert into public.order_status_logs (order_id, from_status, to_status, actor_user_id, actor_org_id, note)
    values (p_order_id, v_from, 'shipped'::public.order_status, public.get_my_user_id(), v_me, p_note);
    return p_order_id;
  end if;

  -- --- KISMİ SEVKİYAT
  select count(*) into v_child_count from public.orders where parent_order_id = p_order_id;
  v_child_no := v_order.order_no || '/' || (v_child_count + 1)::text;

  insert into public.orders (
    order_no, relationship_id, manufacturer_org_id, retailer_org_id, status,
    parent_order_id, total_amount, customer_name, customer_phone, customer_address,
    note
  ) values (
    v_child_no, v_order.relationship_id, v_order.manufacturer_org_id, v_order.retailer_org_id,
    'shipped'::public.order_status, p_order_id, 0,
    v_order.customer_name, v_order.customer_phone, v_order.customer_address,
    p_note
  )
  returning id into v_child_id;

  -- Çocuk sipariş için başlangıç logu ekle (böylece takip detay kartında sevk notu görünür)
  insert into public.order_status_logs (order_id, from_status, to_status, actor_user_id, actor_org_id, note)
  values (v_child_id, 'pending'::public.order_status, 'shipped'::public.order_status, public.get_my_user_id(), v_me, p_note);

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

    select r.retail_unit_price into v_retail
      from public.order_item_retail_prices r
     where r.order_item_id = v_item.id;
    if v_retail is not null then
      insert into public.order_item_retail_prices (order_item_id, retailer_org_id, retail_unit_price)
      values (v_new_item_id, v_order.retailer_org_id, v_retail);
    end if;

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

  update public.orders
     set total_amount = greatest(v_order.total_amount - v_child_total, 0)
   where id = p_order_id;

  select coalesce(sum(quantity), 0) into v_remaining
    from public.order_items where order_id = p_order_id;

  v_to := case when v_remaining = 0
               then 'shipped'::public.order_status
               else 'partially_shipped'::public.order_status
          end;

  update public.orders set status = v_to where id = p_order_id;

  insert into public.order_status_logs (order_id, from_status, to_status, actor_user_id, actor_org_id, note)
  values (p_order_id, v_from, v_to, public.get_my_user_id(), v_me, coalesce(p_note, 'Sevkiyat: ' || v_child_no));

  return v_child_id;
end;
$$;

-- DATA-FIX: Update existing child orders and status logs with parent sevk notes
update public.orders c
set note = (
  select l.note
  from public.order_status_logs l
  where l.order_id = c.parent_order_id
    and (l.to_status = 'partially_shipped' or l.to_status = 'shipped')
    and abs(extract(epoch from (l.created_at - c.created_at))) < 5
    and l.note is not null
    and l.note not like 'Sevkiyat:%'
  order by l.created_at desc
  limit 1
)
where c.parent_order_id is not null
  and c.note is null;

insert into public.order_status_logs (order_id, from_status, to_status, actor_user_id, actor_org_id, note, created_at)
select 
  c.id, 
  'pending'::public.order_status, 
  'shipped'::public.order_status, 
  coalesce(
    (
      select actor_user_id from public.order_status_logs l 
       where l.order_id = c.parent_order_id 
         and abs(extract(epoch from (l.created_at - c.created_at))) < 5
       limit 1
    ),
    c.manufacturer_org_id -- fallback
  ),
  c.manufacturer_org_id, 
  c.note, 
  c.created_at
from public.orders c
where c.parent_order_id is not null
  and not exists (
    select 1 from public.order_status_logs xl 
     where xl.order_id = c.id
  );

notify pgrst, 'reload schema';
