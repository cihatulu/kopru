-- KÖPRÜ — Delete Passive Counterparty

create or replace function public.delete_counterparty(
  p_relationship_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_rel public.relationships%rowtype;
begin
  if public.get_my_org_role() <> 'owner' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_rel from public.relationships where id = p_relationship_id;
  if not found or v_me not in (v_rel.manufacturer_org_id, v_rel.retailer_org_id) then
    raise exception 'RELATIONSHIP_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_rel.status = 'active' then
    raise exception 'CANNOT_DELETE_ACTIVE' using errcode = '22023';
  end if;

  begin
    delete from public.relationships where id = p_relationship_id;
  exception
    when foreign_key_violation then
      raise exception 'HAS_TRANSACTIONS' using errcode = '23503';
  end;
end;
$$;
