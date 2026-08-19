-- Migration: Make order numbers globally unique platform-wide per day.
-- Instead of scoping the order sequence per manufacturer_org_id, we use a single
-- global uuid constant ('00000000-0000-0000-0000-000000000000') so all orders share the same daily sequence.

create or replace function public.next_order_no(p_manufacturer_org_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := current_date;
  v_no int;
  v_global_id uuid := '00000000-0000-0000-0000-000000000000';
begin
  insert into public.order_sequences (manufacturer_org_id, day, last_no)
  values (v_global_id, v_day, 1)
  on conflict (manufacturer_org_id, day)
    do update set last_no = public.order_sequences.last_no + 1
  returning last_no into v_no;

  return to_char(v_day, 'YYMMDD') || '-' || lpad(v_no::text, 4, '0');
end;
$$;

notify pgrst, 'reload schema';
