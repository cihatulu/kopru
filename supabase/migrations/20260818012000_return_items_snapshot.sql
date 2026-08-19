-- Migration: Save returned items snapshot in transactions on return approval.
--
-- When a return is approved, confirm_return_atomic inserts a record into the
-- transactions table. Previously, items_snapshot was left NULL.
-- Now we build the snapshot based on the actual items and quantities being returned
-- so that the current account transaction details show exactly what was returned.

create or replace function public.confirm_return_atomic(
  p_return_id uuid,
  p_approve boolean,
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
  v_line jsonb;
  v_item public.order_items%rowtype;
  v_qty numeric(14,3);
  v_amount numeric(14,2) := 0;
  v_prev numeric(14,2);
  v_total_qty numeric(14,3) := 0;
  v_returned_qty numeric(14,3) := 0;
  v_target_status public.order_status := 'returned';
  v_snapshot jsonb := '[]'::jsonb;
begin
  select * into v_req from public.return_requests
   where id = p_return_id and status = 'pending'
   for update;
  if not found then
    raise exception 'RETURN_NOT_FOUND' using errcode = 'P0002';
  end if;
  -- Kararı malı gönderen taraf verir.
  if v_req.manufacturer_org_id <> v_me then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not p_approve then
    update public.return_requests
       set status = 'rejected', decided_at = now(), decided_by = public.get_my_user_id()
     where id = p_return_id
    returning * into v_req;
    return v_req;
  end if;

  select * into v_order from public.orders where id = v_req.order_id;

  -- TUTAR SİPARİŞTEN HESAPLANIR, talepten değil.
  for v_line in select * from jsonb_array_elements(v_req.items) loop
    select * into v_item from public.order_items
     where id = (v_line->>'order_item_id')::uuid and order_id = v_req.order_id;
    if not found then
      raise exception 'ITEM_NOT_FOUND' using errcode = 'P0002';
    end if;

    v_qty := least((v_line->>'quantity')::numeric, v_item.quantity);
    if v_qty <= 0 then
      raise exception 'INVALID_QUANTITY' using errcode = '22023';
    end if;
    v_amount := v_amount + round(v_item.supplier_unit_price * v_qty, 2);

    -- İade edilen mal üreticinin stoğuna döner.
    if v_item.product_id is not null then
      insert into public.manufacturer_stock (owner_org_id, product_id, quantity)
      values (v_req.manufacturer_org_id, v_item.product_id, v_qty)
      on conflict (owner_org_id, product_id)
        do update set quantity = public.manufacturer_stock.quantity + v_qty,
                      updated_at = now();
    end if;
  end loop;

  -- Compile the snapshot of the returned items specifically
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', coalesce(oi.product_snapshot->>'name', p.name, 'Ürün'),
        'code', coalesce(oi.product_snapshot->>'code', p.code, ''),
        'quantity', (ri.value->>'quantity')::numeric,
        'unit_price', oi.supplier_unit_price,
        'total', round(oi.supplier_unit_price * (ri.value->>'quantity')::numeric, 2)
      )
    ),
    '[]'::jsonb
  ) into v_snapshot
  from jsonb_array_elements(v_req.items) ri
  join public.order_items oi on oi.id = (ri.value->>'order_item_id')::uuid
  left join public.products p on p.id = oi.product_id;

  -- A8: mevcut borç kaydına DOKUNULMAZ; dengeleyici credit eklenir.
  select t.balance_after into v_prev
    from public.transactions t
   where t.relationship_id = v_req.relationship_id
   order by t.created_at desc, t.id desc
   limit 1
     for update;

  insert into public.transactions (
    relationship_id, manufacturer_org_id, retailer_org_id, type, amount,
    balance_after, order_id, description, items_snapshot
  ) values (
    v_req.relationship_id, v_req.manufacturer_org_id, v_req.retailer_org_id,
    'credit', v_amount, coalesce(v_prev, 0) - v_amount, v_req.order_id,
    coalesce('İade: ' || nullif(p_note, ''), 'İade'),
    v_snapshot
  );

  update public.return_requests
     set status = 'approved', approved_amount = v_amount,
         decided_at = now(), decided_by = public.get_my_user_id()
    where id = p_return_id
  returning * into v_req;

  -- KISMI iadede durum 'delivered' kalmalı, TAM iadede 'returned' olmalı.
  for v_qty in select quantity from public.order_items where order_id = v_req.order_id loop
    v_total_qty := v_total_qty + v_qty;
  end loop;

  for v_qty in select (ri.value->>'quantity')::numeric
                 from public.return_requests rr, jsonb_array_elements(rr.items) ri
                where rr.order_id = v_req.order_id and rr.status = 'approved' loop
    v_returned_qty := v_returned_qty + v_qty;
  end loop;

  if v_returned_qty < v_total_qty then
    v_target_status := 'delivered';
  end if;

  update public.orders set status = v_target_status
   where id = v_req.order_id;

  insert into public.order_status_logs (order_id, from_status, to_status, actor_user_id, actor_org_id, note)
  values (v_req.order_id, v_order.status, v_target_status,
          public.get_my_user_id(), v_me, p_note);

  return v_req;
end;
$$;

-- DATA-FIX: Update existing empty return transactions with their actual item snapshots
-- by fetching them from return_requests table where order_id and amount matches.
update public.transactions t
set items_snapshot = (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', coalesce(oi.product_snapshot->>'name', p.name, 'Ürün'),
        'code', coalesce(oi.product_snapshot->>'code', p.code, ''),
        'quantity', (ri.value->>'quantity')::numeric,
        'unit_price', oi.supplier_unit_price,
        'total', round(oi.supplier_unit_price * (ri.value->>'quantity')::numeric, 2)
      )
    ),
    '[]'::jsonb
  )
  from public.return_requests rr,
       jsonb_array_elements(rr.items) ri
  join public.order_items oi on oi.id = (ri.value->>'order_item_id')::uuid
  left join public.products p on p.id = oi.product_id
  where rr.order_id = t.order_id
    and rr.status = 'approved'
    and rr.approved_amount = t.amount
  limit 1
)
where (t.description ilike 'İade%' or t.description ilike 'Sipariş iadesi%')
  and (t.items_snapshot is null or t.items_snapshot = '[]'::jsonb);

notify pgrst, 'reload schema';
