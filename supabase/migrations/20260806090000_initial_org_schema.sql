-- KÖPRÜ — Faz 1: organizasyon grafiği
--
-- Tenant = İLİŞKİ (A1). Ne üretici ne perakendeci tek başına tenant değildir.
-- Misafir taraf ayrı bir tablo veya "hayalet kayıt" değil, is_subscriber=false
-- olan normal bir organizasyon satırıdır (A2) — bu yüzden aboneye yükseltme
-- hiçbir satır taşımaz.
--
-- Ölçek hedefi: ~5.000 üretici × ~50.000 perakendeci × ~500.000 ilişki.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ============================================================ enum'lar

create type public.org_kind as enum ('manufacturer', 'retailer');
create type public.org_role as enum ('owner', 'staff', 'accountant');
create type public.relationship_status as enum ('pending', 'active', 'passive');
create type public.plan_tier as enum ('free', 'basic', 'pro');
create type public.subscription_request_status as enum ('pending', 'approved', 'rejected');

-- ============================================================ VKN / TCKN doğrulama
-- A3: vkn_tc hem giriş kimliği hem organizasyonların yakınsama anahtarıdır.
-- İki eski projede de bu alan doğrulanmamış serbest metindi.

create or replace function public.is_valid_tckn(p text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  d int[];
  i int;
  odd_sum int := 0;
  even_sum int := 0;
  total int := 0;
begin
  if p is null or p !~ '^[1-9][0-9]{10}$' then
    return false;
  end if;

  for i in 1..11 loop
    d[i] := substr(p, i, 1)::int;
  end loop;

  -- 1., 3., 5., 7., 9. haneler
  odd_sum := d[1] + d[3] + d[5] + d[7] + d[9];
  -- 2., 4., 6., 8. haneler
  even_sum := d[2] + d[4] + d[6] + d[8];

  if ((odd_sum * 7) - even_sum) % 10 <> d[10] then
    return false;
  end if;

  for i in 1..10 loop
    total := total + d[i];
  end loop;

  return total % 10 = d[11];
end;
$$;

create or replace function public.is_valid_vkn(p text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  i int;
  digit int;
  tmp int;
  total int := 0;
  check_digit int;
begin
  if p is null or p !~ '^[0-9]{10}$' then
    return false;
  end if;

  for i in 1..9 loop
    digit := substr(p, i, 1)::int;
    tmp := (digit + (10 - i)) % 10;
    if tmp = 9 then
      total := total + tmp;
    else
      total := total + ((tmp * (2 ^ (10 - i))::int) % 9);
    end if;
  end loop;

  check_digit := (10 - (total % 10)) % 10;
  return check_digit = substr(p, 10, 1)::int;
end;
$$;

create or replace function public.is_valid_vkn_tc(p text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select public.is_valid_vkn(p) or public.is_valid_tckn(p);
$$;

-- ============================================================ organizations

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  kind public.org_kind not null,

  company_name text not null check (length(btrim(company_name)) between 2 and 200),
  -- A3: benzersiz + checksum doğrulamalı. Aynı VKN ile ikinci org açılamaz;
  -- iki abone birbirini eklediğinde bu kolon sayesinde AYNI düğümde yakınsarlar.
  vkn_tc text not null unique check (public.is_valid_vkn_tc(vkn_tc)),

  email text,
  phone text,
  address text,
  authorized_name text,

  -- A2: "bizden hizmet alan" = true. Misafir için false; yükseltme bu bayrağı çevirir.
  is_subscriber boolean not null default false,
  plan public.plan_tier,
  enabled_modules jsonb not null default '[]'::jsonb,
  branding jsonb not null default '{}'::jsonb,
  -- Subdomain jsonb içine gömülmez (eski projelerin hatası) — sorgulanabilir kolon.
  subdomain text unique
    check (subdomain is null or subdomain ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'),

  is_active boolean not null default true,
  -- Misafiri kim açtı. Yükseltmeden sonra da tarihsel bilgi olarak kalır.
  created_by_org_id uuid references public.organizations(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Abone ⇔ plan birlikte var olur.
  constraint organizations_plan_chk check (is_subscriber = (plan is not null)),
  -- Subdomain yalnız abonelerde.
  constraint organizations_subdomain_chk check (subdomain is null or is_subscriber),
  -- A15'in bildirimsel FK ile zorlanabilmesi için (aşağıda relationships kullanıyor).
  constraint organizations_id_kind_key unique (id, kind)
);

alter table public.organizations enable row level security;

create index organizations_kind_idx
  on public.organizations (kind, is_subscriber, is_active);
-- 55.000 org içinde ada göre arama — admin listesi tam tarama yapmaz.
create index organizations_name_trgm_idx
  on public.organizations using gin (company_name gin_trgm_ops);

comment on table public.organizations is
  'Üretici ve perakendeci — abone (is_subscriber=true) veya misafir (false). Tek düğüm tipi.';

-- ============================================================ users

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  org_role public.org_role not null default 'owner',

  -- Giriş kimliği. Owner için org.vkn_tc, personel için ondan türetilir.
  -- KİLİTLİ KURAL 2: password_hash kolonu YOKTUR; şifre yalnız auth.users'ta.
  user_code text not null unique check (user_code ~ '^[a-z0-9]{3,32}$'),
  email text,
  full_name text,

  is_active boolean not null default true,
  failed_attempts int not null default 0,
  locked_until timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

create index users_org_idx on public.users (org_id, is_active);

-- ============================================================ platform_admins
-- Bizim ekip. Hiçbir org'a bağlı değil, bu yüzden users tablosunda yaşamaz.

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  label text,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- ============================================================ relationships
-- Sistemin tenant birimi (A1).

create table public.relationships (
  id uuid primary key default gen_random_uuid(),

  manufacturer_org_id uuid not null,
  retailer_org_id uuid not null,

  -- A15 bildirimsel zorlama: generated sabit kolonlar + bileşik FK sayesinde
  -- yanlış kind'a sahip bir org buraya YAZILAMAZ. Trigger'a gerek yok.
  manufacturer_kind public.org_kind
    generated always as ('manufacturer'::public.org_kind) stored,
  retailer_kind public.org_kind
    generated always as ('retailer'::public.org_kind) stored,

  status public.relationship_status not null default 'pending',
  initiated_by_org_id uuid not null references public.organizations(id) on delete cascade,
  discount_rate numeric(5,2) not null default 0 check (discount_rate between 0 and 100),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activated_at timestamptz,

  constraint relationships_pair_key unique (manufacturer_org_id, retailer_org_id),
  constraint relationships_distinct_chk check (manufacturer_org_id <> retailer_org_id),

  foreign key (manufacturer_org_id, manufacturer_kind)
    references public.organizations (id, kind) on delete cascade,
  foreign key (retailer_org_id, retailer_kind)
    references public.organizations (id, kind) on delete cascade
);

alter table public.relationships enable row level security;

create index relationships_mfr_idx on public.relationships (manufacturer_org_id, status);
create index relationships_rtl_idx on public.relationships (retailer_org_id, status);

comment on table public.relationships is
  'Ticari ilişki = tenant birimi. İşlem tabloları bu kenara asılır; RLS ise A16 gereği '
  'denormalize manufacturer_org_id/retailer_org_id üzerinden çalışır.';

-- ============================================================ subscription_requests

create table public.subscription_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid references public.users(id) on delete set null,
  requested_plan public.plan_tier,
  status public.subscription_request_status not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null
);

alter table public.subscription_requests enable row level security;

create unique index subscription_requests_open_uq
  on public.subscription_requests (org_id)
  where status = 'pending';

-- ============================================================ system_logs (partition'lı)
-- KİLİTLİ KURAL 17: aylık partition + 90 gün retention (eski partition DROP edilir).

create table public.system_logs (
  id uuid not null default gen_random_uuid(),
  actor_user_id uuid,
  actor_org_id uuid,
  action text not null,
  entity text,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (id, created_at)
) partition by range (created_at);

alter table public.system_logs enable row level security;

create index system_logs_org_idx on public.system_logs (actor_org_id, created_at desc);

create or replace function public.ensure_log_partition(p_month date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date := date_trunc('month', p_month)::date;
  v_end   date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_name  text := format('system_logs_%s', to_char(v_start, 'YYYYMM'));
begin
  if to_regclass('public.' || v_name) is null then
    execute format(
      'create table public.%I partition of public.system_logs for values from (%L) to (%L)',
      v_name, v_start, v_end
    );
  end if;
end;
$$;

select public.ensure_log_partition(current_date);
select public.ensure_log_partition((current_date + interval '1 month')::date);

-- ============================================================ RLS yardımcıları
-- Hepsi SECURITY DEFINER STABLE + sabit search_path.
-- Politika içinde tablo sorgulamak sonsuz özyinelemeye yol açar (ERROR_PROTOCOLS #3);
-- bu helper'lar RLS'i bypass ettiği için o döngü oluşmaz.

create or replace function public.get_my_user_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.users where id = (select auth.uid());
$$;

create or replace function public.get_my_org_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select org_id from public.users where id = (select auth.uid());
$$;

create or replace function public.get_my_org_kind()
returns public.org_kind
language sql
security definer
stable
set search_path = public
as $$
  select o.kind
    from public.users u
    join public.organizations o on o.id = u.org_id
   where u.id = (select auth.uid());
$$;

create or replace function public.get_my_org_role()
returns public.org_role
language sql
security definer
stable
set search_path = public
as $$
  select org_role from public.users where id = (select auth.uid());
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins where user_id = (select auth.uid())
  );
$$;

-- A16 UYARI: bu fonksiyon RLS SICAK YOLUNDA KULLANILMAZ.
-- 10.000 perakendecisi olan bir üretici için 10.000 satır döner; politikaya konursa
-- her sorguda küme materyalize edilir. Yalnız admin/rapor sorguları içindir.
create or replace function public.my_relationship_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select r.id
    from public.relationships r
   where r.status = 'active'
     and (r.manufacturer_org_id = public.get_my_org_id()
       or r.retailer_org_id     = public.get_my_org_id());
$$;

-- Karşı tarafı görebilir miyim: aramızda bir ilişki kenarı var mı.
create or replace function public.shares_relationship_with(p_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.relationships r
     where (r.manufacturer_org_id = public.get_my_org_id() and r.retailer_org_id = p_org_id)
        or (r.retailer_org_id     = public.get_my_org_id() and r.manufacturer_org_id = p_org_id)
  );
$$;

-- ============================================================ updated_at

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger organizations_touch before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger users_touch before update on public.users
  for each row execute function public.set_updated_at();
create trigger relationships_touch before update on public.relationships
  for each row execute function public.set_updated_at();

-- ============================================================ RLS politikaları
-- KİLİTLİ KURAL 4: tüm politikalarda (select auth.uid()) — helper'lar zaten öyle sarıyor.

-- --- organizations ---
create policy "organizations_select_self_or_counterparty"
on public.organizations for select to authenticated
using (
  id = (select public.get_my_org_id())
  or (select public.shares_relationship_with(id))
  or (select public.is_platform_admin())
);

-- Org oluşturma yalnız RPC (add_counterparty) veya admin üzerinden; doğrudan INSERT yok.
create policy "organizations_admin_write"
on public.organizations for all to authenticated
using ((select public.is_platform_admin()))
with check ((select public.is_platform_admin()));

-- Org sahibi kendi profil bilgilerini güncelleyebilir (plan/abonelik alanları hariç —
-- o kısıt update_own_organization RPC'sinde uygulanır).
create policy "organizations_update_own"
on public.organizations for update to authenticated
using (id = (select public.get_my_org_id()) and (select public.get_my_org_role()) = 'owner')
with check (id = (select public.get_my_org_id()));

-- --- users ---
create policy "users_select_same_org"
on public.users for select to authenticated
using (
  org_id = (select public.get_my_org_id())
  or (select public.is_platform_admin())
);

create policy "users_owner_manage"
on public.users for all to authenticated
using (
  (org_id = (select public.get_my_org_id()) and (select public.get_my_org_role()) = 'owner')
  or (select public.is_platform_admin())
)
with check (
  (org_id = (select public.get_my_org_id()) and (select public.get_my_org_role()) = 'owner')
  or (select public.is_platform_admin())
);

-- --- platform_admins ---
create policy "platform_admins_self_read"
on public.platform_admins for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_platform_admin()));

-- --- relationships ---
-- A16: küme üyeliği değil, denormalize org id eşitliği.
create policy "relationships_select_own_side"
on public.relationships for select to authenticated
using (
  manufacturer_org_id = (select public.get_my_org_id())
  or retailer_org_id  = (select public.get_my_org_id())
  or (select public.is_platform_admin())
);

-- Durum değişikliği (pending → active) yalnız karşı tarafın onayıyla; RPC üzerinden.
create policy "relationships_admin_write"
on public.relationships for all to authenticated
using ((select public.is_platform_admin()))
with check ((select public.is_platform_admin()));

-- --- subscription_requests ---
create policy "subscription_requests_own_org"
on public.subscription_requests for select to authenticated
using (
  org_id = (select public.get_my_org_id())
  or (select public.is_platform_admin())
);

create policy "subscription_requests_insert_own"
on public.subscription_requests for insert to authenticated
with check (
  org_id = (select public.get_my_org_id())
  and (select public.get_my_org_role()) = 'owner'
);

create policy "subscription_requests_admin_decide"
on public.subscription_requests for update to authenticated
using ((select public.is_platform_admin()))
with check ((select public.is_platform_admin()));

-- --- system_logs ---
-- Append-only: yazma yalnız SECURITY DEFINER RPC'lerden. UPDATE/DELETE politikası YOK.
create policy "system_logs_select_own_org"
on public.system_logs for select to authenticated
using (
  actor_org_id = (select public.get_my_org_id())
  or (select public.is_platform_admin())
);

-- ============================================================ grant'ler
-- anon yüzeyi: hiçbir tabloya doğrudan erişim yok. Giriş `login` Edge Function'ından,
-- public takip ileride yalnız token'lı RPC üzerinden açılır.

revoke all on public.organizations from anon;
revoke all on public.users from anon;
revoke all on public.relationships from anon;
revoke all on public.platform_admins from anon;
revoke all on public.subscription_requests from anon;
revoke all on public.system_logs from anon;

notify pgrst, 'reload schema';
