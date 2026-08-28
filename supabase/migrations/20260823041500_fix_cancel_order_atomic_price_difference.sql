-- KÖPRÜ — İptal cari hareketinde (cancel_order_atomic) items_snapshot içine
-- özel talep açıklaması (custom_description) ve fiyat farkı (price_difference) alanlarının dahil edilmesi.

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
  v_snapshot jsonb := '[]'::jsonb;
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

  -- Ürün snapshot'ını order_items tablosundan derle (özel talep ve fark dahil)
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', coalesce(oi.product_snapshot->>'name', p.name, 'Ürün'),
        'code', coalesce(oi.product_snapshot->>'code', p.code, ''),
        'quantity', oi.quantity,
        'unit_price', oi.supplier_unit_price,
        'total', oi.total_price,
        'custom_description', oi.custom_description,
        'price_difference', oi.price_difference
      )
    ),
    '[]'::jsonb
  ) into v_snapshot
  from public.order_items oi
  left join public.products p on p.id = oi.product_id
  where oi.order_id = p_order_id;

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
    balance_after, order_id, description, items_snapshot
  ) values (
    v_order.relationship_id, v_order.manufacturer_org_id, v_order.retailer_org_id,
    'credit', v_order.total_amount,
    coalesce(v_prev, 0) - v_order.total_amount, p_order_id,
    v_desc, v_snapshot
  );

  update public.orders set status = 'cancelled' where id = p_order_id
  returning * into v_order;

  insert into public.order_status_logs (order_id, from_status, to_status, actor_user_id, actor_org_id, note)
  values (p_order_id, v_from, 'cancelled', public.get_my_user_id(), v_me, p_reason);

  return v_order;
end;
$$;

grant execute on function public.cancel_order_atomic(uuid, text) to authenticated;

notify pgrst, 'reload schema';
