-- KÖPRÜ — Faz 7c/7d: raporlar ve finans
--
-- RAPORLAR: her taraf KENDİ tarafını görür. Üretici kendi cirosunu ve marjını,
-- perakendeci kendi alım tutarını ve kârını. Fiyat izolasyonu (A4) raporlarda da
-- geçerlidir — bu yüzden özet fonksiyonları ayrı ve her biri yalnız çağıranın
-- görebileceği katmanları okur.

-- ============================================================ üretici özeti
-- Marj YALNIZ üreticiye döner: product_costs okunur, retail_prices okunmaz.

drop function if exists public.manufacturer_summary(date, date);

create or replace function public.manufacturer_summary(
  p_from date default (current_date - 30),
  p_to date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_result jsonb;
begin
  if public.get_my_org_kind() <> 'manufacturer' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'order_count', count(distinct o.id),
    'revenue', coalesce(sum(i.total_price), 0),
    -- Maliyet yalnız üreticinin kendi tablosundan; perakendeci bu sayıyı hiç görmez.
    'cost', coalesce(sum(coalesce(c.cost_price, 0) * i.quantity), 0),
    'customer_count', count(distinct o.retailer_org_id)
  )
    into v_result
    from public.orders o
    join public.order_items i on i.order_id = o.id
    left join public.product_costs c on c.product_id = i.product_id
   where o.manufacturer_org_id = v_me
     and o.status not in ('cancelled', 'returned')
     and o.created_at >= p_from
     and o.created_at < (p_to + 1);

  return v_result;
end;
$$;

-- ============================================================ perakendeci özeti
-- Kâr YALNIZ perakendeciye döner: retail_prices okunur, product_costs okunmaz.

drop function if exists public.retailer_summary(date, date);

create or replace function public.retailer_summary(
  p_from date default (current_date - 30),
  p_to date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_result jsonb;
begin
  if public.get_my_org_kind() <> 'retailer' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'order_count', count(distinct o.id),
    'purchase_total', coalesce(sum(i.total_price), 0),
    -- Beklenen ciro: yalnız perakendecinin kendi fiyat verdiği kalemler.
    'expected_revenue', coalesce(sum(coalesce(rp.retail_unit_price, 0) * i.quantity), 0),
    'supplier_count', count(distinct o.manufacturer_org_id)
  )
    into v_result
    from public.orders o
    join public.order_items i on i.order_id = o.id
    left join public.order_item_retail_prices rp on rp.order_item_id = i.id
   where o.retailer_org_id = v_me
     and o.status not in ('cancelled', 'returned')
     and o.created_at >= p_from
     and o.created_at < (p_to + 1);

  return v_result;
end;
$$;

-- ============================================================ finans defteri
-- PLAN §9: perakendecinin KENDİ gelir/gider defteri. Tedarikçi carisinden
-- (transactions) tamamen ayrıdır — biri borç ilişkisi, diğeri işletme nakit akışı.

create type public.finance_kind as enum ('income', 'expense');
create type public.payment_method as enum (
  'cash', 'pos_own', 'pos_manufacturer', 'bank_transfer'
);

create table public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  retailer_org_id uuid not null,
  retailer_kind public.org_kind generated always as ('retailer'::public.org_kind) stored,

  kind public.finance_kind not null,
  amount numeric(14,2) not null check (amount > 0),
  method public.payment_method not null default 'cash',
  category text,
  description text not null check (length(btrim(description)) between 1 and 300),
  occurred_on date not null default current_date,

  created_at timestamptz not null default now(),

  foreign key (retailer_org_id, retailer_kind)
    references public.organizations (id, kind) on delete cascade
);

alter table public.finance_entries enable row level security;

create index finance_org_idx
  on public.finance_entries (retailer_org_id, created_at desc, id desc);

-- Yalnız defterin sahibi görür ve yazar. Üreticinin bu tabloya erişimi YOKTUR —
-- perakendecinin nakit akışı ticari ilişkinin parçası değildir.
create policy "finance_owner_all"
on public.finance_entries for all to authenticated
using (retailer_org_id = (select public.get_my_org_id()))
with check (retailer_org_id = (select public.get_my_org_id()));

revoke all on public.finance_entries from anon;

notify pgrst, 'reload schema';
