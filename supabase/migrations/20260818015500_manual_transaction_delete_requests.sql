-- Migration: Manual transaction deletion requests
--
-- If the counterpart is a subscriber, any deletion of a manual transaction must
-- be proposed as a request and approved by the counterpart before it is deleted.

-- 1. Create Deletion Request Table
create table if not exists public.manual_transaction_delete_requests (
  id                 uuid primary key default gen_random_uuid(),
  relationship_id    uuid not null references public.relationships(id) on delete cascade,
  transaction_id     uuid not null references public.transactions(id) on delete cascade,
  requesting_org_id  uuid not null references public.organizations(id) on delete cascade,
  requesting_user_id uuid not null references public.users(id) on delete cascade,
  status             text not null default 'pending'
                       check (status in ('pending', 'approved', 'rejected')),
  created_at         timestamptz not null default now(),
  decided_at         timestamptz,
  decided_by_org_id  uuid references public.organizations(id) on delete set null,
  decided_by_user_id uuid references public.users(id) on delete set null
);

create index if not exists mtdr_rel_status_idx
  on public.manual_transaction_delete_requests (relationship_id, status);

alter table public.manual_transaction_delete_requests enable row level security;

-- Both sides of the relationship can see the requests.
create policy "mtdr_select"
  on public.manual_transaction_delete_requests for select to authenticated
  using (
    exists (
      select 1 from public.relationships r
       where r.id = relationship_id
         and (r.manufacturer_org_id = public.get_my_org_id()
              or r.retailer_org_id  = public.get_my_org_id())
    )
  );

-- 2. request_delete_manual_transaction RPC
create or replace function public.request_delete_manual_transaction(
  p_transaction_id uuid
)
returns jsonb -- { "mode": "direct"|"pending", "id": uuid }
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me     uuid := public.get_my_org_id();
  v_tx     public.transactions%rowtype;
  v_rel    public.relationships%rowtype;
  v_cp     public.organizations%rowtype;
  v_req_id uuid;
begin
  -- Find transaction
  select * into v_tx from public.transactions where id = p_transaction_id for update;
  if not found then
    raise exception 'TRANSACTION_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Cannot delete system generated order transactions
  if v_tx.order_id is not null then
    raise exception 'CANNOT_DELETE_ORDER_TRANSACTION' using errcode = '42501';
  end if;

  -- Check relationship
  select * into v_rel from public.relationships where id = v_tx.relationship_id;
  if not found then
    raise exception 'RELATIONSHIP_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Only parties of the relationship
  if v_me not in (v_rel.manufacturer_org_id, v_rel.retailer_org_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Only owners or accountants
  if public.get_my_org_role() not in ('owner', 'accountant') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Find counterpart
  select * into v_cp
    from public.organizations
   where id = case when v_me = v_rel.manufacturer_org_id
                   then v_rel.retailer_org_id
                   else v_rel.manufacturer_org_id end;

  -- If counterpart is GUEST (not subscriber), delete directly
  if not v_cp.is_subscriber then
    perform public.delete_manual_transaction(p_transaction_id);
    return jsonb_build_object('mode', 'direct', 'id', null);
  end if;

  -- Check if there is already a pending delete request for this transaction
  select id into v_req_id
    from public.manual_transaction_delete_requests
   where transaction_id = p_transaction_id
     and status = 'pending';

  if found then
    raise exception 'DELETE_REQUEST_ALREADY_PENDING' using errcode = '22023';
  end if;

  -- Create deletion request
  insert into public.manual_transaction_delete_requests (
    relationship_id, transaction_id, requesting_org_id, requesting_user_id, status
  ) values (
    v_tx.relationship_id, p_transaction_id, v_me, public.get_my_user_id(), 'pending'
  )
  returning id into v_req_id;

  return jsonb_build_object('mode', 'pending', 'id', v_req_id);
end;
$$;

grant execute on function public.request_delete_manual_transaction(uuid) to authenticated;

-- 3. decide_delete_manual_transaction RPC
create or replace function public.decide_delete_manual_transaction(
  p_request_id uuid,
  p_approve    boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me  uuid := public.get_my_org_id();
  v_req public.manual_transaction_delete_requests%rowtype;
  v_rel public.relationships%rowtype;
begin
  select * into v_req
    from public.manual_transaction_delete_requests
   where id = p_request_id
     for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'REQUEST_ALREADY_DECIDED' using errcode = '22023';
  end if;

  select * into v_rel from public.relationships where id = v_req.relationship_id;

  -- The decider must be the COUNTERPART (not the one who requested deletion)
  if v_me = v_req.requesting_org_id then
    raise exception 'CANNOT_DECIDE_OWN_REQUEST' using errcode = '42501';
  end if;
  if v_me not in (v_rel.manufacturer_org_id, v_rel.retailer_org_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if public.get_my_org_role() not in ('owner', 'accountant') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_approve then
    -- Delete the actual transaction
    perform public.delete_manual_transaction(v_req.transaction_id);
  end if;

  -- Update request status
  update public.manual_transaction_delete_requests
     set status             = case when p_approve then 'approved' else 'rejected' end,
         decided_at         = now(),
         decided_by_org_id  = v_me,
         decided_by_user_id = public.get_my_user_id()
   where id = p_request_id;
end;
$$;

grant execute on function public.decide_delete_manual_transaction(uuid, boolean) to authenticated;

revoke all on public.manual_transaction_delete_requests from anon;

notify pgrst, 'reload schema';
