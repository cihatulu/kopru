-- KÖPRÜ — Faz 4: admin işlemleri ve tek tık aboneye yükseltme
--
-- Ürünün ticari vaadi burada: misafir bir organizasyon TEK TIKLA aboneye dönüşür.
-- Bunun veri taşımadan çalışabilmesinin sebebi A2'dir — misafir zaten grafın
-- içinde gerçek bir düğüm. Yükseltme yalnız bir bayrak + plan + subdomain'dir;
-- `relationships` satırlarına ASLA dokunulmaz (ERROR_PROTOCOLS #15).

-- ============================================================ ilişki sayacı
-- PLAN §17.1: admin listesinde 55.000 org için satır başına COUNT(*) yapılamaz.
-- Sayaç denormalize tutulur, trigger ile güncellenir.

alter table public.organizations
  add column active_relationship_count int not null default 0;

create or replace function public.sync_relationship_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta int;
begin
  if tg_op = 'INSERT' then
    if new.status = 'active' then
      update public.organizations set active_relationship_count = active_relationship_count + 1
       where id in (new.manufacturer_org_id, new.retailer_org_id);
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status = 'active' then
      update public.organizations set active_relationship_count = active_relationship_count - 1
       where id in (old.manufacturer_org_id, old.retailer_org_id);
    end if;
    return old;
  end if;

  -- UPDATE: yalnız aktiflik geçişi sayacı etkiler.
  v_delta := (case when new.status = 'active' then 1 else 0 end)
           - (case when old.status = 'active' then 1 else 0 end);
  if v_delta <> 0 then
    update public.organizations set active_relationship_count = active_relationship_count + v_delta
     where id in (new.manufacturer_org_id, new.retailer_org_id);
  end if;
  return new;
end;
$$;

create trigger relationships_sync_counters
  after insert or update of status or delete on public.relationships
  for each row execute function public.sync_relationship_counters();

-- ============================================================ plan → modüller
-- KİLİTLİ KURAL 15 (çift katman): aynı liste `src/constants/index.ts` içinde de
-- durur. İkisinin sürüklenmesini `src/test/rls.test.ts` içindeki test engeller.

create or replace function public.default_modules_for_plan(p_plan public.plan_tier)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select case p_plan
    when 'free' then
      '["dashboard","catalog","orders","accounts","counterparties"]'::jsonb
    when 'basic' then
      '["dashboard","catalog","orders","accounts","counterparties","stock","reports","announcements"]'::jsonb
    when 'pro' then
      '["dashboard","catalog","orders","accounts","counterparties","stock","reports","announcements","ssh","returns","team","finance","campaigns","roomStaging"]'::jsonb
  end;
$$;

-- ============================================================ tek tık yükseltme

create or replace function public.upgrade_org_to_subscriber(
  p_org_id uuid,
  p_plan public.plan_tier,
  p_subdomain text
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations%rowtype;
  v_sub text := lower(btrim(coalesce(p_subdomain, '')));
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_org from public.organizations where id = p_org_id for update;
  if not found then
    raise exception 'ORG_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_org.is_subscriber then
    raise exception 'ALREADY_SUBSCRIBER' using errcode = '22023';
  end if;
  if v_sub = '' then
    raise exception 'SUBDOMAIN_REQUIRED' using errcode = '22023';
  end if;

  update public.organizations
     set is_subscriber = true,
         plan = p_plan,
         subdomain = v_sub,
         enabled_modules = public.default_modules_for_plan(p_plan)
   where id = p_org_id
  returning * into v_org;

  -- BURADA `relationships` TABLOSUNA HİÇBİR YAZMA YOKTUR VE OLMAMALIDIR.
  -- Yükselen org hem kendi panelinde çalışır hem eski sponsorunun müşterisi
  -- olarak kalır; sipariş geçmişi ve cari bakiyesi olduğu yerde durur.

  insert into public.system_logs (actor_user_id, actor_org_id, action, entity, entity_id, meta)
  values ((select auth.uid()), p_org_id, 'org.upgraded', 'organizations', p_org_id,
          jsonb_build_object('plan', p_plan, 'subdomain', v_sub));

  return v_org;
end;
$$;

create or replace function public.downgrade_org_to_guest(p_org_id uuid)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.organizations
     set is_subscriber = false,
         plan = null,
         subdomain = null,
         enabled_modules = '[]'::jsonb
   where id = p_org_id and is_subscriber
  returning * into v_org;

  if not found then
    raise exception 'NOT_SUBSCRIBER' using errcode = '22023';
  end if;

  -- Abonelik biter, VERİ DURUR. İlişkiler ve geçmiş korunur.
  insert into public.system_logs (actor_user_id, actor_org_id, action, entity, entity_id, meta)
  values ((select auth.uid()), p_org_id, 'org.downgraded', 'organizations', p_org_id, '{}'::jsonb);

  return v_org;
end;
$$;

-- ============================================================ abonelik talebi kararı

create or replace function public.decide_subscription_request(
  p_request_id uuid,
  p_approve boolean,
  p_plan public.plan_tier default null,
  p_subdomain text default null
)
returns public.subscription_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.subscription_requests%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_req from public.subscription_requests
   where id = p_request_id and status = 'pending'
   for update;
  if not found then
    raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_approve then
    if p_plan is null then
      raise exception 'PLAN_REQUIRED' using errcode = '22023';
    end if;
    perform public.upgrade_org_to_subscriber(v_req.org_id, p_plan, p_subdomain);
  end if;

  update public.subscription_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_at = now(),
         decided_by = (select auth.uid())
   where id = p_request_id
  returning * into v_req;

  return v_req;
end;
$$;

-- ============================================================ ilişki durumu (admin)

create or replace function public.admin_set_relationship_status(
  p_relationship_id uuid,
  p_status public.relationship_status
)
returns public.relationships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rel public.relationships%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.relationships
     set status = p_status,
         activated_at = case when p_status = 'active' then coalesce(activated_at, now()) else activated_at end
   where id = p_relationship_id
  returning * into v_rel;

  if not found then
    raise exception 'RELATIONSHIP_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.system_logs (actor_user_id, actor_org_id, action, entity, entity_id, meta)
  values ((select auth.uid()), null, 'relationship.status_changed', 'relationships',
          p_relationship_id, jsonb_build_object('status', p_status));

  return v_rel;
end;
$$;

notify pgrst, 'reload schema';
