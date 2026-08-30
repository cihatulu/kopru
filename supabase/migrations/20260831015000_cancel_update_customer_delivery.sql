-- Migration: cancel_customer_delivery and update_customer_delivery functions

create or replace function public.cancel_customer_delivery(
  p_delivery_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_org_id uuid;
  v_delivery public.customer_deliveries%rowtype;
  v_order public.orders%rowtype;
  v_note_text text;
begin
  select org_id into v_my_org_id from public.profiles where id = auth.uid();

  select * into v_delivery from public.customer_deliveries where id = p_delivery_id;
  if not found then
    raise exception 'Teslimat planı bulunamadı.';
  end if;

  select * into v_order from public.orders where id = v_delivery.order_id;
  if not found then
    raise exception 'Bağlı sipariş bulunamadı.';
  end if;

  if v_delivery.retailer_org_id != v_my_org_id and v_order.retailer_org_id != v_my_org_id then
    raise exception 'Yalnızca siparişin sahibi olan mağaza teslimat planını iptal edebilir.';
  end if;

  -- 1. Durumu iptal yap
  update public.customer_deliveries
  set status = 'cancelled'
  where id = p_delivery_id;

  -- 2. Sipariş zaman çizelgesine not ekle
  v_note_text := 'Müşteri Teslimat Planı İptal Edildi (Plan No: #' || substr(p_delivery_id::text, 1, 8) || ')';
  if p_reason is not null and btrim(p_reason) != '' then
    v_note_text := v_note_text || ' — Sebep: ' || btrim(p_reason);
  end if;

  insert into public.order_status_logs (
    order_id,
    from_status,
    to_status,
    note
  ) values (
    v_delivery.order_id,
    v_order.status,
    v_order.status,
    v_note_text
  );

  return jsonb_build_object(
    'id', p_delivery_id,
    'status', 'cancelled'
  );
end;
$$;

grant execute on function public.cancel_customer_delivery(uuid, text) to authenticated;


create or replace function public.update_customer_delivery(
  p_delivery_id uuid,
  p_delivery_date date,
  p_time_slot text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_org_id uuid;
  v_delivery public.customer_deliveries%rowtype;
  v_order public.orders%rowtype;
  v_time_slot text;
  v_note_text text;
begin
  select org_id into v_my_org_id from public.profiles where id = auth.uid();

  select * into v_delivery from public.customer_deliveries where id = p_delivery_id;
  if not found then
    raise exception 'Teslimat planı bulunamadı.';
  end if;

  select * into v_order from public.orders where id = v_delivery.order_id;
  if not found then
    raise exception 'Bağlı sipariş bulunamadı.';
  end if;

  if v_delivery.retailer_org_id != v_my_org_id and v_order.retailer_org_id != v_my_org_id then
    raise exception 'Yalnızca siparişin sahibi olan mağaza teslimat planını güncelleyebilir.';
  end if;

  v_time_slot := coalesce(nullif(btrim(p_time_slot), ''), '09:00 - 18:00');

  -- 1. Güncelle
  update public.customer_deliveries
  set
    delivery_date = p_delivery_date,
    time_slot = v_time_slot,
    notes = p_notes
  where id = p_delivery_id;

  -- 2. Sipariş zaman çizelgesine not ekle
  v_note_text := 'Müşteri Teslimat Randevusu Güncellendi: ' || to_char(p_delivery_date, 'DD.MM.YYYY') || ' (' || v_time_slot || ')';
  if p_notes is not null and btrim(p_notes) != '' then
    v_note_text := v_note_text || ' — Not: ' || btrim(p_notes);
  end if;

  insert into public.order_status_logs (
    order_id,
    from_status,
    to_status,
    note
  ) values (
    v_delivery.order_id,
    v_order.status,
    v_order.status,
    v_note_text
  );

  return jsonb_build_object(
    'id', p_delivery_id,
    'delivery_date', p_delivery_date,
    'time_slot', v_time_slot,
    'status', v_delivery.status
  );
end;
$$;

grant execute on function public.update_customer_delivery(uuid, date, text, text) to authenticated;

notify pgrst, 'reload schema';
