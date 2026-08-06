-- KÖPRÜ — Faz 6: sipariş yaşam döngüsü ve cari defter
--
-- ÜÇ FİYAT KATMANININ SİPARİŞTEKİ KARŞILIĞI (A4/A5):
--   · order_items.supplier_unit_price  → İKİ TARAF görür. Cari ekstrenin TEK bazı.
--   · order_item_retail_prices          → yalnız perakendeci. Ayrı tablo.
--   · product_costs                     → üreticinin maliyeti; siparişe HİÇ girmez.
--
-- `order_items` tablosunda `retail_unit_price` ve `cost_price` kolonları YOKTUR
-- ve eklenemez (guard-write bloklar, price-isolation.test.ts korur).

create type public.order_status as enum (
  'pending',            -- perakendeci verdi, üretici henüz onaylamadı
  'confirmed',          -- üretici onayladı
  'in_production',
  'partially_shipped',
  'shipped',
  'delivered',
  'cancelled',
  'return_requested',
  'returned'
);

create type public.transaction_type as enum ('debit', 'credit');

-- ============================================================ okunabilir sipariş no

create table public.order_sequences (
  manufacturer_org_id uuid not null,
  day date not null,
  last_no int not null default 0,
  primary key (manufacturer_org_id, day)
);

alter table public.order_sequences enable row level security;
-- Politika yok: yalnız SECURITY DEFINER RPC'ler dokunur.

-- ============================================================ orders

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null,

  relationship_id uuid not null references public.relationships(id),
  -- A16: RLS ve sayfalama denormalize org id üzerinden çalışır, küme üyeliğiyle değil.
  manufacturer_org_id uuid not null references public.organizations(id),
  retailer_org_id uuid not null references public.organizations(id),

  status public.order_status not null default 'pending',
  -- Kısmi sevkiyat ağacı: çocuk sipariş kökü işaret eder.
  parent_order_id uuid references public.orders(id) on delete cascade,

  -- KATMAN 2 toplamı. Cari bu tutardan işler; perakendecinin satış tutarı burada YOK.
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  currency char(3) not null default 'TRY',

  -- Son müşteri bilgileri (perakendecinin müşterisi).
  customer_name text,
  customer_phone text,
  customer_address text,
  note text,

  -- Public takip için tahmin edilemez jeton.
  order_token uuid not null default gen_random_uuid() unique,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint orders_no_unique unique (manufacturer_org_id, order_no)
);

alter table public.orders enable row level security;

-- Hem RLS hem keyset sayfalama AYNI index'i kullanır (A17).
create index orders_mfr_idx on public.orders (manufacturer_org_id, created_at desc, id desc);
create index orders_rtl_idx on public.orders (retailer_org_id, created_at desc, id desc);
create index orders_rel_idx on public.orders (relationship_id, created_at desc);
create index orders_parent_idx on public.orders (parent_order_id) where parent_order_id is not null;

-- ============================================================ order_items
-- DİKKAT: burada `retail_unit_price` veya `cost_price` KOLONU YOKTUR.

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,

  quantity numeric(14,3) not null check (quantity > 0),
  -- KATMAN 2 — iskonto UYGULANMIŞ nihai net birim fiyat (köprü protokolünün kararı korundu).
  supplier_unit_price numeric(14,2) not null check (supplier_unit_price >= 0),
  total_price numeric(14,2) not null check (total_price >= 0),

  -- Allowlist ile üretilir; spread ile ASLA (guard-write bloklar).
  product_snapshot jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

alter table public.order_items enable row level security;
create index order_items_order_idx on public.order_items (order_id);

-- ============================================================ KATMAN 3 — perakendeci satış fiyatı
-- Üretici bu tabloyu HİÇ göremez. Ayrı tablo olmasının sebebi RLS'in kolon
-- düzeyinde koruma sağlamamasıdır.

create table public.order_item_retail_prices (
  order_item_id uuid primary key references public.order_items(id) on delete cascade,
  -- Denormalize sahip (A16): RLS join'siz, tek indexli eşitlik.
  retailer_org_id uuid not null references public.organizations(id) on delete cascade,
  retail_unit_price numeric(14,2) not null check (retail_unit_price >= 0),
  created_at timestamptz not null default now()
);

alter table public.order_item_retail_prices enable row level security;
create index order_item_retail_idx on public.order_item_retail_prices (retailer_org_id);

-- ============================================================ durum geçmişi

create table public.order_status_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  actor_user_id uuid,
  actor_org_id uuid,
  note text,
  created_at timestamptz not null default now()
);

alter table public.order_status_logs enable row level security;
create index order_status_logs_order_idx on public.order_status_logs (order_id, created_at desc);

-- ============================================================ transactions — cari defter
--
-- A8 (değişmezlik): kök siparişin ilk `debit` kaydına UPDATE/DELETE YAPILMAZ.
-- Her düzeltme yeni INSERT ile dengelenir.
-- A18 (running balance): güncel bakiye SUM() ile değil, son satırın
-- `balance_after` değeriyle okunur. Milyonlarca satırda SUM tam tarama demektir.

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id),
  manufacturer_org_id uuid not null references public.organizations(id),
  retailer_org_id uuid not null references public.organizations(id),

  type public.transaction_type not null,
  amount numeric(14,2) not null check (amount >= 0),
  -- Bu satırdan SONRAKİ bakiye. Pozitif = perakendeci borçlu.
  balance_after numeric(14,2) not null,

  order_id uuid references public.orders(id) on delete set null,
  description text not null,
  items_snapshot jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

-- Güncel bakiye = bu index'in ilk satırı. Tek lookup.
create index transactions_rel_idx on public.transactions (relationship_id, created_at desc, id desc);
create index transactions_mfr_idx on public.transactions (manufacturer_org_id, created_at desc, id desc);
create index transactions_rtl_idx on public.transactions (retailer_org_id, created_at desc, id desc);

-- ============================================================ updated_at

create trigger orders_touch before update on public.orders
  for each row execute function public.set_updated_at();

-- ============================================================ RLS
-- A16: küme üyeliği yok, denormalize org id eşitliği var.

create policy "orders_select_own_side"
on public.orders for select to authenticated
using (
  manufacturer_org_id = (select public.get_my_org_id())
  or retailer_org_id  = (select public.get_my_org_id())
  or (select public.is_platform_admin())
);
-- Yazma yalnız atomik RPC'lerden; INSERT/UPDATE politikası YOK.

create policy "order_items_select_via_order"
on public.order_items for select to authenticated
using (
  exists (
    select 1 from public.orders o
     where o.id = order_items.order_id
       and (o.manufacturer_org_id = (select public.get_my_org_id())
         or o.retailer_org_id     = (select public.get_my_org_id()))
  )
);

-- KATMAN 3: üretici için politika YOK → sorgusu 0 satır döner.
create policy "order_item_retail_prices_retailer_only"
on public.order_item_retail_prices for all to authenticated
using (retailer_org_id = (select public.get_my_org_id()))
with check (retailer_org_id = (select public.get_my_org_id()));

create policy "order_status_logs_select_via_order"
on public.order_status_logs for select to authenticated
using (
  exists (
    select 1 from public.orders o
     where o.id = order_status_logs.order_id
       and (o.manufacturer_org_id = (select public.get_my_org_id())
         or o.retailer_org_id     = (select public.get_my_org_id()))
  )
);

-- KİLİTLİ KURAL 8: üretici cariyi yalnız İZLER. INSERT/UPDATE politikası yok;
-- yazma tümüyle atomik RPC'ler üzerinden.
create policy "transactions_select_own_side"
on public.transactions for select to authenticated
using (
  manufacturer_org_id = (select public.get_my_org_id())
  or retailer_org_id  = (select public.get_my_org_id())
  or (select public.is_platform_admin())
);

-- ============================================================ anon yüzeyi

revoke all on public.orders from anon;
revoke all on public.order_items from anon;
revoke all on public.order_item_retail_prices from anon;
revoke all on public.order_status_logs from anon;
revoke all on public.transactions from anon;
revoke all on public.order_sequences from anon;

notify pgrst, 'reload schema';
