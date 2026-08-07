-- KÖPRÜ — Faz 7a: satış sonrası hizmet (SSH) ve iade
--
-- İkisi de ilişkiye asılı talep akışlarıdır; A16 gereği denormalize org id
-- taşırlar ve RLS küme üyeliğiyle değil eşitlikle çalışır.
--
-- İADE VE CARİ (A8): iade onayı mevcut borç kaydını DEĞİŞTİRMEZ; dengeleyici
-- bir credit ekler. Tutar, siparişin kendi snapshot'ından (supplier_unit_price)
-- hesaplanır — perakendecinin satış fiyatı iade tutarına HİÇ karışmaz (A5).

create type public.ssh_status as enum (
  'bekliyor', 'inceleniyor', 'parca_gonderildi', 'tamamlandi', 'iptal'
);

create type public.return_status as enum ('pending', 'approved', 'rejected');

-- ============================================================ plan gating (çift katman)
-- KİLİTLİ KURAL 15: frontend gate tek başına yeterli değil.
--
-- Bir modül, ilişkideki HERHANGİ BİR tarafın planında açıksa kullanılabilir.
-- Gerekçe: özelliğin bedelini abone öder, ama ilişki iki taraflıdır — misafir
-- müşterinin iade talebi açamaması iş anlamında yanlış olurdu.

create or replace function public.relationship_has_module(
  p_relationship_id uuid,
  p_module text
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.relationships r
      join public.organizations o
        on o.id in (r.manufacturer_org_id, r.retailer_org_id)
     where r.id = p_relationship_id
       and o.enabled_modules ? p_module
  );
$$;

-- ============================================================ ssh_requests

create table public.ssh_requests (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id),
  manufacturer_org_id uuid not null references public.organizations(id),
  retailer_org_id uuid not null references public.organizations(id),

  order_id uuid references public.orders(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,

  title text not null check (length(btrim(title)) between 3 and 200),
  description text,
  images text[] not null default '{}',
  status public.ssh_status not null default 'bekliyor',

  -- Perakendecinin son müşterisi; servis genelde onun için açılır.
  customer_name text,
  customer_phone text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ssh_requests enable row level security;

create index ssh_mfr_idx on public.ssh_requests (manufacturer_org_id, created_at desc, id desc);
create index ssh_rtl_idx on public.ssh_requests (retailer_org_id, created_at desc, id desc);

create trigger ssh_requests_touch before update on public.ssh_requests
  for each row execute function public.set_updated_at();

create policy "ssh_select_own_side"
on public.ssh_requests for select to authenticated
using (
  manufacturer_org_id = (select public.get_my_org_id())
  or retailer_org_id  = (select public.get_my_org_id())
  or (select public.is_platform_admin())
);
-- Yazma yalnız RPC'lerden.

-- ============================================================ return_requests

create table public.return_requests (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id),
  manufacturer_org_id uuid not null references public.organizations(id),
  retailer_org_id uuid not null references public.organizations(id),

  order_id uuid not null references public.orders(id) on delete cascade,
  -- [{order_item_id, quantity}] — tutar BURADA TUTULMAZ, siparişten hesaplanır.
  items jsonb not null default '[]'::jsonb,
  reason text,
  status public.return_status not null default 'pending',

  -- Onay anında hesaplanan iade tutarı (KATMAN 2 bazlı).
  approved_amount numeric(14,2),
  decided_at timestamptz,
  decided_by uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.return_requests enable row level security;

create index returns_mfr_idx on public.return_requests (manufacturer_org_id, created_at desc, id desc);
create index returns_rtl_idx on public.return_requests (retailer_org_id, created_at desc, id desc);

create trigger return_requests_touch before update on public.return_requests
  for each row execute function public.set_updated_at();

create policy "returns_select_own_side"
on public.return_requests for select to authenticated
using (
  manufacturer_org_id = (select public.get_my_org_id())
  or retailer_org_id  = (select public.get_my_org_id())
  or (select public.is_platform_admin())
);

revoke all on public.ssh_requests from anon;
revoke all on public.return_requests from anon;

-- ============================================================ SSH RPC'leri

drop function if exists public.create_ssh_request(uuid, text, text, uuid, uuid, jsonb);

create or replace function public.create_ssh_request(
  p_relationship_id uuid,
  p_title text,
  p_description text default null,
  p_order_id uuid default null,
  p_product_id uuid default null,
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
  v_id uuid;
begin
  select * into v_rel from public.relationships
   where id = p_relationship_id and status = 'active';
  if not found then
    raise exception 'NO_ACTIVE_RELATIONSHIP' using errcode = '42501';
  end if;
  if v_me not in (v_rel.manufacturer_org_id, v_rel.retailer_org_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if not public.relationship_has_module(p_relationship_id, 'ssh') then
    raise exception 'MODULE_NOT_ENABLED' using errcode = '42501';
  end if;

  insert into public.ssh_requests (
    relationship_id, manufacturer_org_id, retailer_org_id, order_id, product_id,
    title, description, customer_name, customer_phone
  ) values (
    p_relationship_id, v_rel.manufacturer_org_id, v_rel.retailer_org_id, p_order_id, p_product_id,
    btrim(p_title), p_description,
    nullif(p_customer->>'name', ''), nullif(p_customer->>'phone', '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

drop function if exists public.advance_ssh_status(uuid, public.ssh_status);

create or replace function public.advance_ssh_status(
  p_id uuid,
  p_status public.ssh_status
)
returns public.ssh_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_row public.ssh_requests%rowtype;
begin
  select * into v_row from public.ssh_requests where id = p_id for update;
  if not found then
    raise exception 'SSH_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Servis akışını ÜRETİCİ yürütür; perakendeci yalnız iptal edebilir.
  if p_status = 'iptal' then
    if v_me not in (v_row.manufacturer_org_id, v_row.retailer_org_id) then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
  elsif v_row.manufacturer_org_id <> v_me then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_row.status in ('tamamlandi', 'iptal') then
    raise exception 'SSH_CLOSED' using errcode = '22023';
  end if;

  update public.ssh_requests set status = p_status where id = p_id
  returning * into v_row;
  return v_row;
end;
$$;

-- ============================================================ İADE RPC'leri

drop function if exists public.create_return_request(uuid, jsonb, text);

create or replace function public.create_return_request(
  p_order_id uuid,
  p_items jsonb,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_order public.orders%rowtype;
  v_id uuid;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_RETURN' using errcode = '22023';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  -- İadeyi malı alan taraf açar.
  if v_order.retailer_org_id <> v_me then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if not public.relationship_has_module(v_order.relationship_id, 'returns') then
    raise exception 'MODULE_NOT_ENABLED' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.return_requests
     where order_id = p_order_id and status = 'pending'
  ) then
    raise exception 'RETURN_ALREADY_PENDING' using errcode = '22023';
  end if;

  insert into public.return_requests (
    relationship_id, manufacturer_org_id, retailer_org_id, order_id, items, reason
  ) values (
    v_order.relationship_id, v_order.manufacturer_org_id, v_order.retailer_org_id,
    p_order_id, p_items, p_reason
  )
  returning id into v_id;

  return v_id;
end;
$$;

drop function if exists public.confirm_return_atomic(uuid, boolean, text);

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

  update public.orders set status = 'returned'::public.order_status
   where id = v_req.order_id;

  insert into public.order_status_logs (order_id, from_status, to_status, actor_user_id, actor_org_id, note)
  values (v_req.order_id, v_order.status, 'returned'::public.order_status,
          public.get_my_user_id(), v_me, p_note);

  return v_req;
end;
$$;

notify pgrst, 'reload schema';
