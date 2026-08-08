-- KÖPRÜ — Bayi daveti
--
-- `add_counterparty` karşı tarafı SESSİZCE açar: abone bir VKN yazar, misafir org
-- oluşur, giriş bilgilerini elden iletmek gerekir. Davet bunun tersini yapar —
-- karşı taraf kendi bilgilerini kendi girer, kendi şifresini kendi belirler.
--
-- Token URL'de taşınır; tahmin edilemez olmak zorunda. Bu yüzden token
-- İSTEMCİDEN GELMEZ, burada üretilir (gen_random_bytes).

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,

  -- Daveti gönderen abone. Kabul edildiğinde ilişkinin bir ucu bu olur.
  inviter_org_id uuid not null references public.organizations(id) on delete cascade,
  created_by_user_id uuid references public.users(id) on delete set null,

  -- Öneriler: davet edilen bunları formda görür, düzeltebilir.
  company_name text,
  email text,
  phone text,
  authorized_name text,

  -- Doluysa davet O VKN'ye kilitlidir; link başkasına iletilse de işe yaramaz.
  vkn_tc text,

  discount_rate numeric(5,2) not null default 0 check (discount_rate >= 0 and discount_rate <= 100),

  expires_at timestamptz not null,
  used_at timestamptz,
  used_by_org_id uuid references public.organizations(id) on delete set null,
  revoked_at timestamptz,

  created_at timestamptz not null default now()
);

-- Davet listesi: gönderenin kendi listesi, en yeniden eskiye keyset (A17).
create index invitations_inviter_idx
  on public.invitations (inviter_org_id, created_at desc, id desc);

-- Kabul akışı token ile tek satır arar; unique index zaten yeterli.

alter table public.invitations enable row level security;

-- Yalnız gönderen org kendi davetlerini görür. Kabul akışı service role ile
-- Edge Function'da çalıştığı için PUBLIC bir SELECT politikası YOK — token'ı
-- bilen birinin tabloyu taraması mümkün olmamalı.
create policy invitations_select_own on public.invitations
  for select
  using (inviter_org_id = (select public.get_my_org_id()));

-- ============================================================ davet oluşturma

create or replace function public.create_invitation(
  p_company_name text default null,
  p_email text default null,
  p_phone text default null,
  p_authorized_name text default null,
  p_vkn_tc text default null,
  p_discount_rate numeric default 0,
  p_valid_days int default 14
)
returns public.invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me public.organizations%rowtype;
  v_role public.org_role;
  v_vkn text := nullif(regexp_replace(coalesce(p_vkn_tc, ''), '[\s.-]', '', 'g'), '');
  v_days int := least(greatest(coalesce(p_valid_days, 14), 1), 90);
  v_row public.invitations;
begin
  select o.* into v_me from public.organizations o where o.id = public.get_my_org_id();
  if not found then
    raise exception 'NO_ORG' using errcode = '42501';
  end if;

  -- add_counterparty ile aynı kapı: yalnız aboneler ekosistemi büyütür.
  if not v_me.is_subscriber then
    raise exception 'NOT_SUBSCRIBER' using errcode = '42501';
  end if;

  v_role := public.get_my_org_role();
  if v_role not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_vkn is not null then
    if not public.is_valid_vkn_tc(v_vkn) then
      raise exception 'INVALID_VKN' using errcode = '22023';
    end if;
    if v_vkn = v_me.vkn_tc then
      raise exception 'SELF_REFERENCE' using errcode = '22023';
    end if;
  end if;

  insert into public.invitations
    (token, inviter_org_id, created_by_user_id, company_name, email, phone,
     authorized_name, vkn_tc, discount_rate, expires_at)
  values
    (-- base64url: '+' ve '/' URL'de kaçış ister, '=' dolgusu gereksiz.
     translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_'),
     v_me.id, public.get_my_user_id(),
     nullif(btrim(p_company_name), ''), nullif(btrim(p_email), ''),
     nullif(btrim(p_phone), ''), nullif(btrim(p_authorized_name), ''),
     v_vkn, coalesce(p_discount_rate, 0), now() + make_interval(days => v_days))
  returning * into v_row;

  insert into public.system_logs (actor_user_id, actor_org_id, action, entity, entity_id, meta)
  values ((select auth.uid()), v_me.id, 'invitation.created', 'invitations', v_row.id,
          jsonb_build_object('vkn_locked', v_vkn is not null));

  return v_row;
end;
$$;

-- ============================================================ daveti iptal etme

create or replace function public.revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.invitations;
begin
  select i.* into v_row
    from public.invitations i
   where i.id = p_invitation_id
     and i.inviter_org_id = public.get_my_org_id()
   for update;

  if not found then
    raise exception 'INVITATION_NOT_FOUND' using errcode = '42501';
  end if;

  -- Kullanılmış daveti iptal etmek anlamsız: ilişki zaten kurulmuş.
  if v_row.used_at is not null then
    raise exception 'ALREADY_USED' using errcode = '22023';
  end if;

  update public.invitations set revoked_at = now() where id = v_row.id;

  insert into public.system_logs (actor_user_id, actor_org_id, action, entity, entity_id, meta)
  values ((select auth.uid()), v_row.inviter_org_id, 'invitation.revoked',
          'invitations', v_row.id, '{}'::jsonb);
end;
$$;

grant execute on function public.create_invitation(text, text, text, text, text, numeric, int)
  to authenticated;
grant execute on function public.revoke_invitation(uuid) to authenticated;

notify pgrst, 'reload schema';
