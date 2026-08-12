-- KÖPRÜ — Perakendeci Ekip Yönetimi
-- retailer_staff_assignments: perakendecinin kendi satış/muhasebe personeli
-- retailer_invitations:       e-posta davetleri

-- ─── Tablolar ────────────────────────────────────────────────────────────────

create type public.retailer_team_role as enum ('retailer_staff', 'retailer_accountant');

create table public.retailer_staff_assignments (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         public.retailer_team_role not null default 'retailer_staff',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (org_id, user_id)
);

create table public.retailer_invitations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  email        text not null,
  role         public.retailer_team_role not null default 'retailer_staff',
  token        text not null unique,
  expires_at   timestamptz not null,
  used_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.retailer_staff_assignments enable row level security;
alter table public.retailer_invitations enable row level security;

-- Perakendeci: kendi org'unu okuyabilir ve yönetebilir
create policy "retailer_team_select" on public.retailer_staff_assignments
  for select using (org_id = public.get_my_org_id());

create policy "retailer_team_insert" on public.retailer_staff_assignments
  for insert with check (
    org_id = public.get_my_org_id()
    and public.get_my_org_kind() = 'retailer'
    and public.get_my_org_role() = 'owner'
  );

create policy "retailer_team_update" on public.retailer_staff_assignments
  for update using (
    org_id = public.get_my_org_id()
    and public.get_my_org_kind() = 'retailer'
    and public.get_my_org_role() = 'owner'
  );

create policy "retailer_team_delete" on public.retailer_staff_assignments
  for delete using (
    org_id = public.get_my_org_id()
    and public.get_my_org_kind() = 'retailer'
    and public.get_my_org_role() = 'owner'
  );

-- Davetler
create policy "retailer_inv_select" on public.retailer_invitations
  for select using (org_id = public.get_my_org_id());

create policy "retailer_inv_insert" on public.retailer_invitations
  for insert with check (
    org_id = public.get_my_org_id()
    and public.get_my_org_kind() = 'retailer'
    and public.get_my_org_role() = 'owner'
  );

create policy "retailer_inv_update" on public.retailer_invitations
  for update using (org_id = public.get_my_org_id());

notify pgrst, 'reload schema';
