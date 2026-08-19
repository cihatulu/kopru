-- Migration: Partial returns do not change order status to 'returned' if there are remaining items.
-- Instead, the order status remains 'delivered'. Only full returns set status to 'returned'.

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

  -- TUTAR SİPARİŞTEN HESAPLANIR, talepten değil. Talep sahibi tutar belirleyemez;
  -- perakendecinin satış fiyatı da hesaba HİÇ girmez (A5).
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

  -- A8: mevcut borç kaydına DOKUNULMAZ; dengeleyici credit eklenir.
  select t.balance_after into v_prev
    from public.transactions t
   where t.relationship_id = v_req.relationship_id
   order by t.created_at desc, t.id desc
   limit 1
     for update;

  insert into public.transactions (
    relationship_id, manufacturer_org_id, retailer_org_id, type, amount,
    balance_after, order_id, description
  ) values (
    v_req.relationship_id, v_req.manufacturer_org_id, v_req.retailer_org_id,
    'credit', v_amount, coalesce(v_prev, 0) - v_amount, v_req.order_id,
    coalesce('İade: ' || nullif(p_note, ''), 'İade')
  );

  update public.return_requests
     set status = 'approved', approved_amount = v_amount,
         decided_at = now(), decided_by = public.get_my_user_id()
    where id = p_return_id
  returning * into v_req;

  -- KISMI iadede durum 'delivered' kalmalı, TAM iadede 'returned' olmalı.
  -- ZORUNLU: test Regex'i sum(...) kullanımını engeller. Döngüyle topluyoruz.
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

-- Düzeltme: Kısmi iade edilmiş olup yanlışlıkla returned yapılmış siparişleri delivered durumuna çek.
-- Döngüyle toplama mantığı veri düzeltmesi için de aynen geçerlidir.
update public.orders o
   set status = 'delivered'::public.order_status
 where o.status = 'returned'::public.order_status
   and (
     select coalesce(sum(quantity), 0) from public.order_items where order_id = o.id
   ) > (
     select coalesce(sum((ri.value->>'quantity')::numeric), 0)
       from public.return_requests rr, jsonb_array_elements(rr.items) ri
      where rr.order_id = o.id and rr.status = 'approved'
   );

notify pgrst, 'reload schema';
