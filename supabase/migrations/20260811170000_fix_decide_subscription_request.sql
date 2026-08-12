-- KÖPRÜ — Fix decide_subscription_request RPC Enum Cast & Already Subscriber Handling

create or replace function public.decide_subscription_request(
  p_request_id uuid,
  p_approve boolean,
  p_plan public.plan_tier default 'basic',
  p_subdomain text default null
)
returns public.subscription_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.subscription_requests%rowtype;
  v_is_sub boolean;
  v_plan public.plan_tier := coalesce(p_plan, 'basic');
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
    select is_subscriber into v_is_sub from public.organizations where id = v_req.org_id;
    if not v_is_sub then
      perform public.upgrade_org_to_subscriber(v_req.org_id, v_plan, p_subdomain);
    end if;
  end if;

  update public.subscription_requests
     set status = case when p_approve then 'approved'::public.subscription_request_status else 'rejected'::public.subscription_request_status end,
         decided_at = now(),
         decided_by = (select auth.uid())
   where id = p_request_id
  returning * into v_req;

  return v_req;
end;
$$;

notify pgrst, 'reload schema';
