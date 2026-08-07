-- KÖPRÜ — Faz 7b: duyurular (furniture-platform'dan port)
--
-- Üretici, müşterilerine duyuru yayınlar. Duyuru ya TÜM müşterilere ya da tek
-- bir perakendeciye gider.
--
-- Görünürlük ilişki üzerinden kurulur: yalnız o üreticiyle AKTİF ilişkisi olan
-- perakendeci görebilir. Bu, "eski müşteri yeni duyuruları görmeye devam etsin mi"
-- sorusunu ilişki durumuna bağlayarak çözer.

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  -- Duyuruyu yayınlayan üretici.
  owner_org_id uuid not null,
  owner_kind public.org_kind generated always as ('manufacturer'::public.org_kind) stored,

  -- Doluysa duyuru YALNIZ bu perakendeciye gider; boşsa tüm aktif müşterilere.
  target_retailer_org_id uuid references public.organizations(id) on delete cascade,

  title text not null check (length(btrim(title)) between 3 and 200),
  body text not null check (length(btrim(body)) between 1 and 5000),
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (owner_org_id, owner_kind)
    references public.organizations (id, kind) on delete cascade
);

alter table public.announcements enable row level security;

create index announcements_owner_idx
  on public.announcements (owner_org_id, created_at desc, id desc);
create index announcements_target_idx
  on public.announcements (target_retailer_org_id) where target_retailer_org_id is not null;

create trigger announcements_touch before update on public.announcements
  for each row execute function public.set_updated_at();

-- ============================================================ okundu bilgisi

create table public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  retailer_org_id uuid not null references public.organizations(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, retailer_org_id)
);

alter table public.announcement_reads enable row level security;
create index announcement_reads_org_idx on public.announcement_reads (retailer_org_id);

-- ============================================================ RLS

-- Yayınlayan üretici kendi duyurularını tam görür ve yönetir.
create policy "announcements_owner_all"
on public.announcements for all to authenticated
using (owner_org_id = (select public.get_my_org_id()))
with check (owner_org_id = (select public.get_my_org_id()));

-- Perakendeci: aktif ilişkisi olan üreticinin, kendisine veya herkese açık duyuruları.
-- EXISTS kullanılır (SECURITY DEFINER fonksiyon değil) ki planlayıcı yarı-birleştirmeye
-- çevirebilsin — katalog politikasıyla aynı gerekçe (A16/A17).
create policy "announcements_customer_select"
on public.announcements for select to authenticated
using (
  is_active
  and (
    target_retailer_org_id is null
    or target_retailer_org_id = (select public.get_my_org_id())
  )
  and exists (
    select 1 from public.relationships r
     where r.manufacturer_org_id = announcements.owner_org_id
       and r.retailer_org_id = (select public.get_my_org_id())
       and r.status = 'active'
  )
);

-- Okundu kaydını yalnız okuyan perakendeci yazar; üretici toplu görür.
create policy "announcement_reads_own"
on public.announcement_reads for all to authenticated
using (retailer_org_id = (select public.get_my_org_id()))
with check (retailer_org_id = (select public.get_my_org_id()));

create policy "announcement_reads_owner_select"
on public.announcement_reads for select to authenticated
using (
  exists (
    select 1 from public.announcements a
     where a.id = announcement_reads.announcement_id
       and a.owner_org_id = (select public.get_my_org_id())
  )
);

revoke all on public.announcements from anon;
revoke all on public.announcement_reads from anon;

notify pgrst, 'reload schema';
