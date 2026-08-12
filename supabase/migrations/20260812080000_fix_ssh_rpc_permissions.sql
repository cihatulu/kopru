-- ============================================================
-- Platform admin ve RLS genişletmesi — create_ssh_request & set_ssh_images
-- ============================================================

create or replace function public.create_ssh_request(
  p_relationship_id uuid,
  p_title text,
  p_description text default null,
  p_order_id uuid default null,
  p_product_id uuid default null,
  p_customer jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_rel public.relationships%rowtype;
  v_id uuid;
begin
  select * into v_rel from public.relationships
   where id = p_relationship_id and status = 'active';
  if not found then
    raise exception 'NO_ACTIVE_RELATIONSHIP' using errcode = '42501';
  end if;

  if v_me is not null and v_me not in (v_rel.manufacturer_org_id, v_rel.retailer_org_id) and not public.is_platform_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not public.relationship_has_module(p_relationship_id, 'ssh') then
    raise exception 'MODULE_NOT_ENABLED' using errcode = '42501';
  end if;

  insert into public.ssh_requests (
    relationship_id, manufacturer_org_id, retailer_org_id, order_id, product_id,
    title, description, customer_name, customer_phone
  ) values (
    p_relationship_id, v_rel.manufacturer_org_id, v_rel.retailer_org_id, p_order_id, p_product_id,
    btrim(p_title), p_description,
    nullif(p_customer->>'name', ''), nullif(p_customer->>'phone', '')
  )
  returning id into v_id;

  return v_id;
end;
$$;


create or replace function public.set_ssh_images(p_ssh_id uuid, p_paths text[])
returns public.ssh_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_row public.ssh_requests%rowtype;
begin
  select * into v_row from public.ssh_requests where id = p_ssh_id for update;
  if not found then
    raise exception 'SSH_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_me is not null and v_me not in (v_row.manufacturer_org_id, v_row.retailer_org_id) and not public.is_platform_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_row.status in ('tamamlandi', 'iptal') then
    raise exception 'SSH_CLOSED' using errcode = '22023';
  end if;

  if coalesce(array_length(p_paths, 1), 0) > 10 then
    raise exception 'TOO_MANY_IMAGES' using errcode = '22023';
  end if;

  update public.ssh_requests
     set images = coalesce(p_paths, '{}')
   where id = p_ssh_id
  returning * into v_row;

  return v_row;
end;
$$;
