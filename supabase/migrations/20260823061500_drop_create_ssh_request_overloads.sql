-- KÖPRÜ — create_ssh_request fonksiyonunun eski aşırı yüklemelerini (overloads) temizleme.

drop function if exists public.create_ssh_request(uuid, text, text, uuid, uuid, jsonb);
drop function if exists public.create_ssh_request(uuid, text, text, uuid, uuid, numeric, jsonb, jsonb);
drop function if exists public.create_ssh_request(uuid, text, text, uuid, uuid, jsonb, integer, jsonb);
drop function if exists public.create_ssh_request(uuid, text, text, uuid, uuid, jsonb, numeric, jsonb);

create or replace function public.create_ssh_request(
  p_relationship_id uuid,
  p_title           text,
  p_description     text    default null,
  p_order_id        uuid    default null,
  p_product_id      uuid    default null,
  p_customer        jsonb   default '{}'::jsonb,
  p_quantity        integer default 1,
  p_items           jsonb   default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me            uuid := public.get_my_org_id();
  v_rel           public.relationships%rowtype;
  v_ssh_id        uuid;
  v_order         public.orders%rowtype;
  v_item          jsonb;
  v_item_prod_id  uuid;
  v_item_name     text;
  v_item_qty      integer;
  v_first_prod_id uuid    := p_product_id;
  v_first_qty     integer := coalesce(p_quantity, 1);
begin
  select * into v_rel from public.relationships where id = p_relationship_id;
  if not found then
    raise exception 'RELATIONSHIP_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_rel.status <> 'active' then
    raise exception 'RELATIONSHIP_NOT_ACTIVE' using errcode = '22023';
  end if;
  if v_me not in (v_rel.manufacturer_org_id, v_rel.retailer_org_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_order_id is not null then
    select * into v_order from public.orders where id = p_order_id;
    if not found then
      raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
    end if;
    if v_order.relationship_id <> p_relationship_id then
      raise exception 'ORDER_RELATIONSHIP_MISMATCH' using errcode = '22023';
    end if;
  end if;

  if p_items is not null and jsonb_typeof(p_items) = 'array' and jsonb_array_length(p_items) > 0 then
    v_item := p_items->0;
    if (v_item->>'product_id') is not null and (v_item->>'product_id') <> '' then
      v_first_prod_id := (v_item->>'product_id')::uuid;
    end if;
    v_first_qty := coalesce((v_item->>'quantity')::integer, 1);
  end if;

  insert into public.ssh_requests (
    relationship_id,
    manufacturer_org_id,
    retailer_org_id,
    order_id,
    product_id,
    quantity,
    title,
    description,
    customer_name,
    customer_phone
  ) values (
    p_relationship_id,
    v_rel.manufacturer_org_id,
    v_rel.retailer_org_id,
    p_order_id,
    v_first_prod_id,
    v_first_qty,
    p_title,
    p_description,
    nullif(btrim(coalesce(p_customer->>'name', '')), ''),
    nullif(btrim(coalesce(p_customer->>'phone', '')), '')
  )
  returning id into v_ssh_id;

  if p_items is not null and jsonb_typeof(p_items) = 'array' and jsonb_array_length(p_items) > 0 then
    for v_item in select * from jsonb_array_elements(p_items) loop
      v_item_prod_id := null;
      if (v_item->>'product_id') is not null and (v_item->>'product_id') <> '' then
        v_item_prod_id := (v_item->>'product_id')::uuid;
      end if;
      v_item_name := coalesce(nullif(btrim(v_item->>'product_name'), ''), 'Ürün');
      v_item_qty  := coalesce((v_item->>'quantity')::integer, 1);

      insert into public.ssh_request_items (
        ssh_request_id,
        product_id,
        product_name,
        quantity
      ) values (
        v_ssh_id,
        v_item_prod_id,
        v_item_name,
        greatest(v_item_qty, 1)
      );
    end loop;
  elsif v_first_prod_id is not null then
    insert into public.ssh_request_items (
      ssh_request_id,
      product_id,
      product_name,
      quantity
    )
    select
      v_ssh_id,
      p.id,
      coalesce(p.name, 'Ürün'),
      greatest(v_first_qty, 1)
    from public.products p
    where p.id = v_first_prod_id;
  end if;

  insert into public.ssh_status_logs (
    ssh_id, manufacturer_org_id, retailer_org_id, from_status, to_status, actor_user_id, actor_org_id, note
  ) values (
    v_ssh_id, v_rel.manufacturer_org_id, v_rel.retailer_org_id, null, 'bekliyor', (select auth.uid()), v_me, 'Talep açıldı'
  );

  return v_ssh_id;
end;
$$;

grant execute on function public.create_ssh_request(uuid, text, text, uuid, uuid, jsonb, integer, jsonb) to authenticated;

notify pgrst, 'reload schema';
