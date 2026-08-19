-- Migration: Require approval for existing guest manufacturers when added by retailers
--
-- Re-apply the rule where:
-- 1. If the manufacturer is already in the database (v_created is false), we set status to 'pending'
--    even if they are a guest manufacturer (is_subscriber is false).
-- 2. If the manufacturer is newly created (v_created is true), we set status to 'active' immediately.

create or replace function public.add_counterparty(
  p_vkn_tc text,
  p_company_name text default null,
  p_email text default null,
  p_phone text default null,
  p_authorized_name text default null,
  p_discount_rate numeric default 0
)
returns public.add_counterparty_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me public.organizations%rowtype;
  v_role public.org_role;
  v_target public.organizations%rowtype;
  v_target_kind public.org_kind;
  v_vkn text := regexp_replace(coalesce(p_vkn_tc, ''), '[\s.-]', '', 'g');
  v_rel public.relationships%rowtype;
  v_created boolean := false;
  v_status public.relationship_status;
  v_mfr uuid;
  v_rtl uuid;
begin
  select o.* into v_me
    from public.organizations o
   where o.id = public.get_my_org_id();
  if not found then
    raise exception 'NO_ORG' using errcode = '42501';
  end if;

  -- Yalnız ABONELER karşı taraf ekebilir; misafir kendi ekosistemini büyütemez.
  if not v_me.is_subscriber then
    raise exception 'NOT_SUBSCRIBER' using errcode = '42501';
  end if;

  v_role := public.get_my_org_role();
  if v_role not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not public.is_valid_vkn_tc(v_vkn) then
    raise exception 'INVALID_VKN' using errcode = '22023';
  end if;
  if v_vkn = v_me.vkn_tc then
    raise exception 'SELF_REFERENCE' using errcode = '22023';
  end if;

  -- A15: karşı taraf her zaman TERS tipte olur.
  v_target_kind := case v_me.kind when 'manufacturer' then 'retailer' else 'manufacturer' end;

  select o.* into v_target from public.organizations o where o.vkn_tc = v_vkn;

  if found then
    -- VKN YAKINSAMASI: kayıt zaten var, kopya AÇILMAZ.
    if v_target.kind <> v_target_kind then
      raise exception 'KIND_MISMATCH' using errcode = '22023';
    end if;
  else
    insert into public.organizations
      (kind, company_name, vkn_tc, email, phone, authorized_name,
       is_subscriber, created_by_org_id)
    values
      (v_target_kind, coalesce(nullif(btrim(p_company_name), ''), v_vkn), v_vkn,
       p_email, p_phone, p_authorized_name, false, v_me.id)
    returning * into v_target;
    v_created := true;
  end if;

  v_mfr := case when v_me.kind = 'manufacturer' then v_me.id else v_target.id end;
  v_rtl := case when v_me.kind = 'retailer'     then v_me.id else v_target.id end;

  select r.* into v_rel
    from public.relationships r
   where r.manufacturer_org_id = v_mfr and r.retailer_org_id = v_rtl;

  if found then
    -- İdempotency: mevcut kenarın durumu sessizce değiştirilmez.
    return (v_rel.id, v_target.id, false, v_rel.status, true)::public.add_counterparty_result;
  end if;

  -- ── KURAL ──────────────────────────────────────────────────────────────────
  -- Hedef ABONE   → pending; karşı taraf onaylamadan ilişki kurulmaz.
  -- Hedef MİSAFİR → Eğer yeni oluşturulduysa (v_created is true) -> active;
  --                 çünkü onu sisteme ekleyen taraf sponsorudur.
  --                 Eğer sistemde zaten varsa (v_created is false) -> pending;
  --                 çünkü misafir de olsa kendi paneli/girişi vardır ve onaylamadan eklenemez.
  -- ───────────────────────────────────────────────────────────────────────────
  v_status := case 
    when v_target.is_subscriber then 'pending'::public.relationship_status
    when not v_created then 'pending'::public.relationship_status
    else 'active'::public.relationship_status
  end;

  insert into public.relationships
    (manufacturer_org_id, retailer_org_id, status, initiated_by_org_id, discount_rate,
     activated_at)
  values
    (v_mfr, v_rtl, v_status, v_me.id, coalesce(p_discount_rate, 0),
     case when v_status = 'active' then now() end)
  returning * into v_rel;

  insert into public.system_logs (actor_user_id, actor_org_id, action, entity, entity_id, meta)
  values ((select auth.uid()), v_me.id, 'counterparty.added', 'relationships', v_rel.id,
          jsonb_build_object('target_org', v_target.id, 'org_created', v_created,
                             'status', v_status));

  return (v_rel.id, v_target.id, v_created, v_status, false)::public.add_counterparty_result;
end;
$$;

-- Clean up any active relationship for VKN 40000000005 that was set to active
-- during the revert step, so that we can test the pending connection flow again.
update public.relationships r
set status = 'pending', activated_at = null
where status = 'active'
  and (
    r.manufacturer_org_id in (select id from public.organizations where vkn_tc = '40000000005')
    or r.retailer_org_id in (select id from public.organizations where vkn_tc = '40000000005')
  );

notify pgrst, 'reload schema';
