-- Manuel cari kayıt düzenleme ve silme fonksiyonları

create or replace function public.recalculate_relationship_balances(p_relationship_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
  v_running numeric(14,2) := 0;
begin
  for v_rec in 
    select id, type, amount 
    from public.transactions 
    where relationship_id = p_relationship_id 
    order by created_at asc, id asc 
    for update
  loop
    if v_rec.type = 'debit' then
      v_running := v_running + v_rec.amount;
    else
      v_running := v_running - v_rec.amount;
    end if;
    
    update public.transactions 
       set balance_after = v_running 
     where id = v_rec.id;
  end loop;
end;
$$;

create or replace function public.update_manual_transaction(
  p_transaction_id uuid,
  p_type public.transaction_type,
  p_amount numeric,
  p_description text
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_tx public.transactions%rowtype;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT' using errcode = '22023';
  end if;
  if p_description is null or length(trim(p_description)) = 0 then
    raise exception 'INVALID_DESCRIPTION' using errcode = '22023';
  end if;

  select * into v_tx from public.transactions where id = p_transaction_id for update;
  if not found then
    raise exception 'TRANSACTION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_tx.order_id is not null then
    raise exception 'CANNOT_EDIT_ORDER_TRANSACTION' using errcode = '42501';
  end if;

  if v_me not in (v_tx.manufacturer_org_id, v_tx.retailer_org_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.transactions
     set type = p_type,
         amount = p_amount,
         description = trim(p_description)
   where id = p_transaction_id
  returning * into v_tx;

  perform public.recalculate_relationship_balances(v_tx.relationship_id);

  select * into v_tx from public.transactions where id = p_transaction_id;
  return v_tx;
end;
$$;

create or replace function public.delete_manual_transaction(
  p_transaction_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_tx public.transactions%rowtype;
  v_rel_id uuid;
begin
  select * into v_tx from public.transactions where id = p_transaction_id for update;
  if not found then
    raise exception 'TRANSACTION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_tx.order_id is not null then
    raise exception 'CANNOT_DELETE_ORDER_TRANSACTION' using errcode = '42501';
  end if;

  if v_me not in (v_tx.manufacturer_org_id, v_tx.retailer_org_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_rel_id := v_tx.relationship_id;

  delete from public.transactions where id = p_transaction_id;

  perform public.recalculate_relationship_balances(v_rel_id);

  return true;
end;
$$;

grant execute on function public.update_manual_transaction(uuid, public.transaction_type, numeric, text) to authenticated;
grant execute on function public.delete_manual_transaction(uuid) to authenticated;
