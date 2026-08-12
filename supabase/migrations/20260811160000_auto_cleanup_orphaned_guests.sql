-- KÖPRÜ — Auto Cleanup Orphaned Guests on Counterparty Delete

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
  v_other_id uuid;
  v_is_sub boolean;
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

  v_other_id := case when v_rel.manufacturer_org_id = v_me then v_rel.retailer_org_id else v_rel.manufacturer_org_id end;

  begin
    delete from public.relationships where id = p_relationship_id;
  exception
    when foreign_key_violation then
      raise exception 'HAS_TRANSACTIONS' using errcode = '23503';
  end;

  -- Karşı taraf misafir firma ise (is_subscriber = false) ve başka hiç ilişkisi kalmadıysa organizasyon kaydını temizle
  select is_subscriber into v_is_sub from public.organizations where id = v_other_id;
  if found and v_is_sub = false then
    if not exists (
      select 1 from public.relationships
       where manufacturer_org_id = v_other_id or retailer_org_id = v_other_id
    ) then
      delete from public.products where owner_org_id = v_other_id;
      delete from public.product_groups where owner_org_id = v_other_id;
      delete from public.users where org_id = v_other_id;
      delete from public.organizations where id = v_other_id;
    end if;
  end if;
end;
$$;
