-- KÖPRÜ — Faz 2: katalog + ÜÇ FİYAT KATMANI
--
-- Projenin en yüksek riskli kuralı (A4). Köprü çağında fiyat izolasyonu
-- "o alanı hiç göndermemek" ile sağlanıyordu; tek veritabanında bu koruma
-- kendiliğinden KAYBOLUR. Postgres'te RLS satır düzeyindedir, kolon düzeyinde
-- değildir; GRANT SELECT (kolon) ise PostgREST ile kırılgandır.
--
-- Bu yüzden gizli fiyatlar AYRI TABLOLARA konur:
--
--   1. Üretici maliyeti          → product_costs            (yalnız sahibi üretici)
--   2. Üretici satışı            → products.supplier_price  (HER İKİ TARAF — carinin tek bazı)
--      = perakendeci maliyeti
--   3. Perakendeci satışı        → retail_prices            (yalnız o perakendeci)
--
-- Sonuç: yanlışlıkla select('*') yazan bir geliştirici bile karşı tarafın
-- fiyatını çekemez. Sızıntı yapısal olarak imkânsızdır.

create type public.product_type as enum ('single', 'set');

-- ============================================================ product_groups

create table public.product_groups (
  id uuid primary key default gen_random_uuid(),
  owner_org_id uuid not null,
  owner_kind public.org_kind generated always as ('manufacturer'::public.org_kind) stored,
  parent_group_id uuid references public.product_groups(id) on delete set null,
  name text not null check (length(btrim(name)) between 1 and 120),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Grup yalnız bir ÜRETİCİYE ait olabilir (bildirimsel, trigger'sız).
  foreign key (owner_org_id, owner_kind)
    references public.organizations (id, kind) on delete cascade
);

alter table public.product_groups enable row level security;
create index product_groups_owner_idx on public.product_groups (owner_org_id, is_active);

-- ============================================================ products
-- DİKKAT: bu tabloda `cost_price` KOLONU YOKTUR ve eklenemez (guard-write bloklar).

create table public.products (
  id uuid primary key default gen_random_uuid(),
  owner_org_id uuid not null,
  owner_kind public.org_kind generated always as ('manufacturer'::public.org_kind) stored,
  group_id uuid references public.product_groups(id) on delete set null,

  name text not null check (length(btrim(name)) between 1 and 200),
  code text not null check (length(btrim(code)) between 1 and 64),
  description text,

  -- KATMAN 2 — üreticinin satış fiyatı = perakendecinin maliyeti.
  -- Köprüden geçen tek fiyat buydu; tek DB'de de iki tarafın gördüğü tek fiyat budur.
  -- Cari ekstre YALNIZCA bu katmandan hesaplanır (A5).
  supplier_price numeric(14,2) not null check (supplier_price >= 0),
  currency char(3) not null default 'TRY',

  type public.product_type not null default 'single',
  set_contents jsonb not null default '[]'::jsonb,
  variants jsonb not null default '[]'::jsonb,
  images text[] not null default '{}',

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint products_owner_code_key unique (owner_org_id, code),
  -- Alt tabloların sahipliği bildirimsel doğrulayabilmesi için.
  constraint products_id_owner_key unique (id, owner_org_id),

  foreign key (owner_org_id, owner_kind)
    references public.organizations (id, kind) on delete cascade
);

alter table public.products enable row level security;

create index products_owner_idx on public.products (owner_org_id, is_active, created_at desc, id desc);
create index products_name_trgm_idx on public.products using gin (name gin_trgm_ops);

comment on column public.products.supplier_price is
  'KATMAN 2: üreticinin satış fiyatı = perakendecinin maliyeti. İki tarafın da gördüğü '
  'TEK fiyat ve cari ekstrenin tek bazı. Üretici maliyeti product_costs, perakendeci '
  'satış fiyatı retail_prices tablosundadır — asla bu tabloda değil.';

-- ============================================================ KATMAN 1 — product_costs
-- Üreticinin kendi maliyeti. Perakendeci bu tabloyu HİÇ göremez.

create table public.product_costs (
  product_id uuid primary key,
  -- Denormalize sahip (A16): RLS tek indexli eşitliğe iner, join gerekmez.
  owner_org_id uuid not null,
  cost_price numeric(14,2) not null check (cost_price >= 0),
  updated_at timestamptz not null default now(),

  -- Bileşik FK: owner_org_id ürünün gerçek sahibi olmak ZORUNDA (trigger'sız garanti).
  foreign key (product_id, owner_org_id)
    references public.products (id, owner_org_id) on delete cascade
);

alter table public.product_costs enable row level security;
create index product_costs_owner_idx on public.product_costs (owner_org_id);

comment on table public.product_costs is
  'KATMAN 1: üretici maliyeti. Ayrı tablo olmasının sebebi RLS''in kolon düzeyinde '
  'koruma sağlamamasıdır. Perakendeci bu tabloya hiçbir koşulda erişemez.';

-- ============================================================ KATMAN 3 — retail_prices
-- Perakendecinin kendi satış fiyatı. Üretici bu tabloyu HİÇ göremez.

create table public.retail_prices (
  retailer_org_id uuid not null,
  retailer_kind public.org_kind generated always as ('retailer'::public.org_kind) stored,
  product_id uuid not null references public.products(id) on delete cascade,
  retail_price numeric(14,2) not null check (retail_price >= 0),
  updated_at timestamptz not null default now(),

  primary key (retailer_org_id, product_id),
  foreign key (retailer_org_id, retailer_kind)
    references public.organizations (id, kind) on delete cascade
);

alter table public.retail_prices enable row level security;
create index retail_prices_product_idx on public.retail_prices (product_id);

comment on table public.retail_prices is
  'KATMAN 3: perakendecinin satış fiyatı (kâr marjı). Üretici bu tabloya hiçbir '
  'koşulda erişemez.';

-- ============================================================ stok

create table public.manufacturer_stock (
  owner_org_id uuid not null,
  product_id uuid not null,
  quantity numeric(14,3) not null default 0,
  unit text not null default 'adet',
  updated_at timestamptz not null default now(),

  primary key (owner_org_id, product_id),
  foreign key (product_id, owner_org_id)
    references public.products (id, owner_org_id) on delete cascade
);

alter table public.manufacturer_stock enable row level security;

create table public.retailer_stock (
  retailer_org_id uuid not null,
  retailer_kind public.org_kind generated always as ('retailer'::public.org_kind) stored,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity numeric(14,3) not null default 0,
  unit text not null default 'adet',
  updated_at timestamptz not null default now(),

  primary key (retailer_org_id, product_id),
  foreign key (retailer_org_id, retailer_kind)
    references public.organizations (id, kind) on delete cascade
);

alter table public.retailer_stock enable row level security;

-- ============================================================ updated_at

create trigger product_groups_touch before update on public.product_groups
  for each row execute function public.set_updated_at();
create trigger products_touch before update on public.products
  for each row execute function public.set_updated_at();
create trigger product_costs_touch before update on public.product_costs
  for each row execute function public.set_updated_at();
create trigger retail_prices_touch before update on public.retail_prices
  for each row execute function public.set_updated_at();
create trigger manufacturer_stock_touch before update on public.manufacturer_stock
  for each row execute function public.set_updated_at();
create trigger retailer_stock_touch before update on public.retailer_stock
  for each row execute function public.set_updated_at();

-- ============================================================ RLS
--
-- Katalog görünürlüğü için EXISTS kullanılır, shares_relationship_with() DEĞİL:
-- SECURITY DEFINER fonksiyon planlayıcı için kara kutudur ve satır başına çağrılır.
-- EXISTS ise relationships_pair_key unique index'i üzerinden yarı-birleştirmeye
-- (semi-join) dönüşebilir — katalog listeleri bu yolda ölçeklenir (A16/A17).

-- --- product_groups ---
create policy "product_groups_select_owner_or_customer"
on public.product_groups for select to authenticated
using (
  owner_org_id = (select public.get_my_org_id())
  or exists (
    select 1 from public.relationships r
     where r.manufacturer_org_id = product_groups.owner_org_id
       and r.retailer_org_id = (select public.get_my_org_id())
       and r.status = 'active'
  )
  or (select public.is_platform_admin())
);

create policy "product_groups_write_owner"
on public.product_groups for all to authenticated
using (owner_org_id = (select public.get_my_org_id()))
with check (owner_org_id = (select public.get_my_org_id()));

-- --- products: KATMAN 2 iki tarafa da açık ---
create policy "products_select_owner_or_customer"
on public.products for select to authenticated
using (
  owner_org_id = (select public.get_my_org_id())
  or exists (
    select 1 from public.relationships r
     where r.manufacturer_org_id = products.owner_org_id
       and r.retailer_org_id = (select public.get_my_org_id())
       and r.status = 'active'
  )
  or (select public.is_platform_admin())
);

create policy "products_write_owner"
on public.products for all to authenticated
using (owner_org_id = (select public.get_my_org_id()))
with check (owner_org_id = (select public.get_my_org_id()));

-- --- product_costs: KATMAN 1, YALNIZ sahibi üretici ---
-- Perakendeci için hiçbir SELECT politikası yoktur → sorgu 0 satır döner.
create policy "product_costs_owner_only"
on public.product_costs for all to authenticated
using (owner_org_id = (select public.get_my_org_id()))
with check (owner_org_id = (select public.get_my_org_id()));

-- --- retail_prices: KATMAN 3, YALNIZ o perakendeci ---
-- Üretici için hiçbir SELECT politikası yoktur → sorgu 0 satır döner.
create policy "retail_prices_retailer_only"
on public.retail_prices for all to authenticated
using (retailer_org_id = (select public.get_my_org_id()))
with check (retailer_org_id = (select public.get_my_org_id()));

-- --- stok ---
-- KİLİTLİ KURAL 14: yazma update-stock Edge Function'ından (service role).
-- Buradaki politikalar yalnız OKUMA içindir.
create policy "manufacturer_stock_select_owner"
on public.manufacturer_stock for select to authenticated
using (owner_org_id = (select public.get_my_org_id()));

create policy "retailer_stock_select_owner"
on public.retailer_stock for select to authenticated
using (retailer_org_id = (select public.get_my_org_id()));

-- ============================================================ anon yüzeyi

revoke all on public.product_groups from anon;
revoke all on public.products from anon;
revoke all on public.product_costs from anon;
revoke all on public.retail_prices from anon;
revoke all on public.manufacturer_stock from anon;
revoke all on public.retailer_stock from anon;

notify pgrst, 'reload schema';
