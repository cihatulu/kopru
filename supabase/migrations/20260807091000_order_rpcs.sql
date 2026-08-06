-- KÖPRÜ — Faz 6: atomik sipariş RPC'leri
--
-- Her RPC TEK İMZALIDIR (A9). İmza değişirse: DROP → CREATE → NOTIFY.
-- Hepsi ilgili tüm yazmayı TEK transaction'da yapar.

-- ============================================================ yardımcı: bakiye

-- Güncel bakiye = ilişkinin SON transactions satırındaki balance_after (A18).
-- SUM() kullanılmaz; milyonlarca satırda tam tarama demektir.
create or replace function public.current_balance(p_relationship_id uuid)
returns numeric
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select t.balance_after
       from public.transactions t
      where t.relationship_id = p_relationship_id
      order by t.created_at desc, t.id desc
      limit 1),
    0
  );
$$;

-- ============================================================ yardımcı: sipariş no

create or replace function public.next_order_no(p_manufacturer_org_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := current_date;
  v_no int;
begin
  insert into public.order_sequences (manufacturer_org_id, day, last_no)
  values (p_manufacturer_org_id, v_day, 1)
  on conflict (manufacturer_org_id, day)
    do update set last_no = public.order_sequences.last_no + 1
  returning last_no into v_no;

  return to_char(v_day, 'YYMMDD') || '-' || lpad(v_no::text, 4, '0');
end;
$$;

-- ============================================================ sipariş ver

drop function if exists public.place_order_atomic(uuid, jsonb, jsonb);

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
    customer_name, customer_phone, customer_address, note
  ) values (
    public.next_order_no(v_rel.manufacturer_org_id),
    p_relationship_id, v_rel.manufacturer_org_id, v_rel.retailer_org_id, 'pending',
    nullif(p_customer->>'name', ''), nullif(p_customer->>'phone', ''),
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
    -- product_costs'a HİÇ bakılmaz — üreticinin maliyeti siparişe girmez (A5).
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

    -- Stok: sipariş anında düşer. İstemci stoğa doğrudan yazamaz; burası sunucudur.
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

  -- --- CARİ: kök siparişin İLK debit kaydı. Bu satıra bir daha DOKUNULMAZ (A8).
  -- Önceki satırı kilitle ki eşzamanlı iki sipariş aynı bakiyeyi yarıştırmasın (A18).
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

-- ============================================================ durum ilerlet

drop function if exists public.advance_order_status(uuid, public.order_status, text);

create or replace function public.advance_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_note text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_order public.orders%rowtype;
  -- Eski durum UPDATE'ten ÖNCE saklanır; `returning * into` sonrası v_order.status
  -- artık yeni durumdur ve geçmiş kaydı yanlış yazılırdı.
  v_from public.order_status;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  v_from := v_order.status;

  -- Üretim akışı üreticinin, teslim onayı perakendecinindir.
  if p_status in ('confirmed', 'in_production', 'shipped') then
    if v_order.manufacturer_org_id <> v_me then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
  elsif p_status = 'delivered' then
    if v_order.retailer_org_id <> v_me then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
  else
    raise exception 'INVALID_TRANSITION' using errcode = '22023';
  end if;

  if v_order.status in ('cancelled', 'returned', 'delivered') then
    raise exception 'ORDER_CLOSED' using errcode = '22023';
  end if;

  update public.orders set status = p_status where id = p_order_id
  returning * into v_order;

  insert into public.order_status_logs (order_id, from_status, to_status, actor_user_id, actor_org_id, note)
  values (p_order_id, v_from, p_status, public.get_my_user_id(), v_me, p_note);

  return v_order;
end;
$$;

-- ============================================================ sipariş iptali

drop function if exists public.cancel_order_atomic(uuid, text);

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
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  v_from := v_order.status;
  if v_me not in (v_order.manufacturer_org_id, v_order.retailer_org_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_order.status in ('cancelled', 'returned', 'delivered', 'shipped') then
    raise exception 'ORDER_CLOSED' using errcode = '22023';
  end if;

  -- Stok iade edilir.
  for v_item in select product_id, quantity from public.order_items where order_id = p_order_id loop
    if v_item.product_id is not null then
      update public.manufacturer_stock
         set quantity = quantity + v_item.quantity, updated_at = now()
       where owner_org_id = v_order.manufacturer_org_id and product_id = v_item.product_id;
    end if;
  end loop;

  -- A8: ilk debit'e DOKUNULMAZ. İptal, DENGELEYİCİ yeni bir credit ile yazılır.
  select t.balance_after into v_prev
    from public.transactions t
   where t.relationship_id = v_order.relationship_id
   order by t.created_at desc, t.id desc
   limit 1
     for update;

  insert into public.transactions (
    relationship_id, manufacturer_org_id, retailer_org_id, type, amount,
    balance_after, order_id, description
  ) values (
    v_order.relationship_id, v_order.manufacturer_org_id, v_order.retailer_org_id,
    'credit', v_order.total_amount,
    coalesce(v_prev, 0) - v_order.total_amount, p_order_id,
    coalesce('Sipariş iptali: ' || nullif(p_reason, ''), 'Sipariş iptali')
  );

  update public.orders set status = 'cancelled' where id = p_order_id
  returning * into v_order;

  insert into public.order_status_logs (order_id, from_status, to_status, actor_user_id, actor_org_id, note)
  values (p_order_id, v_from, 'cancelled', public.get_my_user_id(), v_me, p_reason);

  return v_order;
end;
$$;

-- ============================================================ elle cari hareketi
-- KİLİTLİ KURAL 8: cari yazımını perakendeci veya accountant yapar; üretici izler.

drop function if exists public.add_manual_transaction(uuid, public.transaction_type, numeric, text);

create or replace function public.add_manual_transaction(
  p_relationship_id uuid,
  p_type public.transaction_type,
  p_amount numeric,
  p_description text
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_rel public.relationships%rowtype;
  v_prev numeric(14,2);
  v_row public.transactions%rowtype;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT' using errcode = '22023';
  end if;
  if coalesce(btrim(p_description), '') = '' then
    raise exception 'DESCRIPTION_REQUIRED' using errcode = '22023';
  end if;

  select * into v_rel from public.relationships where id = p_relationship_id;
  if not found then
    raise exception 'RELATIONSHIP_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_rel.retailer_org_id <> v_me or public.get_my_org_role() not in ('owner', 'accountant') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select t.balance_after into v_prev
    from public.transactions t
   where t.relationship_id = p_relationship_id
   order by t.created_at desc, t.id desc
   limit 1
     for update;

  insert into public.transactions (
    relationship_id, manufacturer_org_id, retailer_org_id, type, amount,
    balance_after, description
  ) values (
    p_relationship_id, v_rel.manufacturer_org_id, v_rel.retailer_org_id, p_type, p_amount,
    coalesce(v_prev, 0) + (case when p_type = 'debit' then p_amount else -p_amount end),
    btrim(p_description)
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- ============================================================ public sipariş takibi
-- anon erişimi: yalnız jeton bilen görür. Fiyat DÖNMEZ.

drop function if exists public.track_order(uuid);

create or replace function public.track_order(p_token uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'order_no', o.order_no,
    'status', o.status,
    'created_at', o.created_at,
    'customer_name', o.customer_name,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', i.product_snapshot->>'name',
        'quantity', i.quantity
      ))
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.order_token = p_token;
$$;

grant execute on function public.track_order(uuid) to anon;

notify pgrst, 'reload schema';
