-- KÖPRÜ — Faz 8: Lead/CRM (furniture-platform'dan port)
--
-- Aday firma takibi. TAMAMEN platform admininindir; hiçbir üretici veya
-- perakendeci bu tabloyu göremez — kendi rakiplerinin adaylarını görmeleri
-- söz konusu bile olamaz.
--
-- `match_org_id`: bir aday sonradan sisteme kaydolursa VKN üzerinden eşleşir.
-- Bu, organizasyonların yakınsama anahtarının (A3) CRM tarafındaki karşılığıdır.

create type public.lead_status as enum (
  'new', 'contacted', 'interested', 'converted', 'rejected'
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (length(btrim(company_name)) between 2 and 200),
  -- Doluysa checksum'lı olmak zorunda; yakınsama bu alandan yürür.
  vkn_tc text check (vkn_tc is null or public.is_valid_vkn_tc(vkn_tc)),

  kind public.org_kind,
  city text,
  phone text,
  email text,
  website text,
  source text,
  note text,

  status public.lead_status not null default 'new',
  -- Aday sisteme kaydolduysa hangi org olduğu.
  matched_org_id uuid references public.organizations(id) on delete set null,

  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads enable row level security;

create index leads_status_idx on public.leads (status, created_at desc, id desc);
create index leads_vkn_idx on public.leads (vkn_tc) where vkn_tc is not null;
create index leads_name_trgm_idx on public.leads using gin (company_name gin_trgm_ops);

create trigger leads_touch before update on public.leads
  for each row execute function public.set_updated_at();

-- YALNIZ platform admini. Başka hiçbir rol için politika YOKTUR.
create policy "leads_admin_only"
on public.leads for all to authenticated
using ((select public.is_platform_admin()))
with check ((select public.is_platform_admin()));

revoke all on public.leads from anon;

-- ============================================================ otomatik eşleşme
-- Yeni bir organizasyon açıldığında, aynı VKN'li bekleyen aday varsa
-- otomatik olarak "dönüştü" işaretlenir. Elle takip hatasını ortadan kaldırır.

create or replace function public.match_lead_to_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.leads
     set status = 'converted',
         matched_org_id = new.id
   where vkn_tc = new.vkn_tc
     and status <> 'converted';
  return new;
end;
$$;

create trigger organizations_match_lead
  after insert on public.organizations
  for each row execute function public.match_lead_to_org();

notify pgrst, 'reload schema';
