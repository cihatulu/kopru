-- ============================================================
-- RPC: request_subscription — Misafir org abonelik başvuru fonksiyonu
-- ============================================================

create or replace function public.request_subscription(
  p_plan public.plan_tier default 'pro',
  p_note text default null
)
returns public.subscription_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me public.organizations%rowtype;
  v_user_id uuid := (select auth.uid());
  v_req public.subscription_requests%rowtype;
begin
  select o.* into v_me
    from public.organizations o
   where o.id = public.get_my_org_id();

  if not found then
    raise exception 'NO_ORG' using errcode = '42501';
  end if;

  if public.get_my_org_role() <> 'owner' and not public.is_platform_admin() then
    raise exception 'FORBIDDEN_OWNER_REQUIRED' using errcode = '42501';
  end if;

  if v_me.is_subscriber then
    raise exception 'ALREADY_SUBSCRIBER' using errcode = '22023';
  end if;

  select * into v_req
    from public.subscription_requests
   where org_id = v_me.id and status = 'pending';

  if found then
    return v_req;
  end if;

  insert into public.subscription_requests (org_id, requested_by, requested_plan, note, status)
  values (v_me.id, v_user_id, coalesce(p_plan, 'pro'::public.plan_tier), p_note, 'pending')
  returning * into v_req;

  insert into public.system_logs (actor_user_id, actor_org_id, action, entity, entity_id, meta)
  values (v_user_id, v_me.id, 'subscription.requested', 'subscription_requests', v_req.id, '{}'::jsonb);

  return v_req;
end;
$$;
