-- KÖPRÜ — Nihai Müşteriye Teslimat / Sevkiyat Akışı Mimarisi
--
-- Perakendeci mağazanın, fabrikadan teslim aldığı siparişleri son müşterisine
-- sevk etmek üzere randevu planlamasını, tarih/saat aralığı belirlemesini,
-- adres/telefon güncellemesini ve takip linki üzerinden müşteriye sunulmasını sağlar.

create table if not exists public.customer_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  retailer_org_id uuid not null references public.organizations(id) on delete cascade,
  delivery_date date not null,
  time_slot text not null, -- Örn: "09:00 - 12:00", "13:00 - 17:00", "17:00 - 21:00"
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  notes text,
  status text not null default 'planned' check (status in ('planned', 'shipped', 'delivered', 'cancelled')),
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- İndeksler
create index if not exists idx_customer_deliveries_order on public.customer_deliveries(order_id);
create index if not exists idx_customer_deliveries_retailer on public.customer_deliveries(retailer_org_id);

-- RLS
alter table public.customer_deliveries enable row level security;

drop policy if exists "customer_deliveries_select" on public.customer_deliveries;
create policy "customer_deliveries_select" on public.customer_deliveries
  for select using (retailer_org_id = public.get_my_org_id());

drop policy if exists "customer_deliveries_insert" on public.customer_deliveries;
create policy "customer_deliveries_insert" on public.customer_deliveries
  for insert with check (retailer_org_id = public.get_my_org_id());

drop policy if exists "customer_deliveries_update" on public.customer_deliveries;
create policy "customer_deliveries_update" on public.customer_deliveries
  for update using (retailer_org_id = public.get_my_org_id());

drop policy if exists "customer_deliveries_delete" on public.customer_deliveries;
create policy "customer_deliveries_delete" on public.customer_deliveries
  for delete using (retailer_org_id = public.get_my_org_id());

-- Teslimat Planlama RPC'si
create or replace function public.schedule_customer_delivery(
  p_order_id uuid,
  p_delivery_date date,
  p_time_slot text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_my_org_id uuid;
  v_delivery_id uuid;
  v_time_slot text;
  v_formatted_date text;
  v_note_text text;
begin
  v_my_org_id := public.get_my_org_id();
  if v_my_org_id is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'Sipariş bulunamadı.';
  end if;

  if v_order.retailer_org_id != v_my_org_id then
    raise exception 'Yalnızca siparişin sahibi olan mağaza teslimat planlayabilir.';
  end if;

  v_time_slot := coalesce(nullif(btrim(p_time_slot), ''), '09:00 - 18:00');

  -- 1. customer_deliveries tablosuna ekle
  insert into public.customer_deliveries (
    order_id,
    retailer_org_id,
    delivery_date,
    time_slot,
    customer_name,
    customer_phone,
    customer_address,
    notes,
    status,
    items
  ) values (
    p_order_id,
    v_my_org_id,
    p_delivery_date,
    v_time_slot,
    coalesce(nullif(btrim(p_customer_name), ''), coalesce(v_order.customer_name, 'Müşteri')),
    coalesce(nullif(btrim(p_customer_phone), ''), coalesce(v_order.customer_phone, '')),
    coalesce(nullif(btrim(p_customer_address), ''), coalesce(v_order.customer_address, '')),
    p_notes,
    'planned',
    coalesce(p_items, '[]'::jsonb)
  )
  returning id into v_delivery_id;

  -- 2. Siparişteki müşteri bilgilerini güncelle (değiştirilmişse)
  update public.orders
  set
    customer_name = coalesce(nullif(btrim(p_customer_name), ''), customer_name),
    customer_phone = coalesce(nullif(btrim(p_customer_phone), ''), customer_phone),
    customer_address = coalesce(nullif(btrim(p_customer_address), ''), customer_address)
  where id = p_order_id;

  -- 3. Sipariş zaman çizelgesine (order_status_logs) log ekle
  v_formatted_date := to_char(p_delivery_date, 'DD.MM.YYYY');
  v_note_text := 'Müşteri Teslimatı Planlandı: ' || v_formatted_date || ' (' || v_time_slot || ')';
  if p_notes is not null and btrim(p_notes) != '' then
    v_note_text := v_note_text || ' — Not: ' || btrim(p_notes);
  end if;

  insert into public.order_status_logs (
    order_id,
    from_status,
    to_status,
    note
  ) values (
    p_order_id,
    v_order.status,
    v_order.status,
    v_note_text
  );

  return jsonb_build_object(
    'id', v_delivery_id,
    'delivery_date', p_delivery_date,
    'time_slot', v_time_slot,
    'status', 'planned'
  );
end;
$$;

grant execute on function public.schedule_customer_delivery(uuid, date, text, text, text, text, text, jsonb) to authenticated;

-- Public Sipariş Takibi (track_order) güncellemesi: customer_deliveries alanını ekler
drop function if exists public.track_order(uuid);

create or replace function public.track_order(p_token uuid)
returns table (
  order_no            text,
  status              public.order_status,
  customer_name       text,
  note                text,
  created_at          timestamptz,
  updated_at          timestamptz,
  items               jsonb,
  returned_items      jsonb,
  history             jsonb,
  shipments           jsonb,
  payments            jsonb,
  customer_deliveries jsonb
)
language sql
security definer
stable
set search_path = public
as $$
  select
    r.order_no,
    r.status,
    r.customer_name,
    r.note,
    r.created_at,
    r.updated_at,
    public.track_order_items(r.id),
    public.track_order_returns(r.id),
    public.track_order_history(r.id),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'order_no', c.order_no,
          'status', c.status,
          'note', c.note,
          'created_at', c.created_at,
          'updated_at', c.updated_at,
          'items', public.track_order_items(c.id),
          'returned_items', public.track_order_returns(c.id),
          'history', public.track_order_history(c.id)
        )
        order by c.created_at asc
      )
      from public.orders c where c.parent_order_id = r.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'amount', f.amount,
          'method', f.method,
          'description', f.description,
          'created_at', f.created_at
        )
        order by f.created_at asc
      )
      from public.finance_entries f
      where f.kind = 'income'
        and (f.order_id = r.id
             or f.order_id in (select c.id from public.orders c where c.parent_order_id = r.id))
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'delivery_date', d.delivery_date,
          'time_slot', d.time_slot,
          'customer_name', d.customer_name,
          'customer_phone', d.customer_phone,
          'customer_address', d.customer_address,
          'notes', d.notes,
          'status', d.status,
          'items', d.items,
          'created_at', d.created_at
        )
        order by d.created_at desc
      )
      from public.customer_deliveries d where d.order_id = r.id
    ), '[]'::jsonb)
  from public.orders r
  where r.order_token = p_token;
$$;

grant execute on function public.track_order(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
