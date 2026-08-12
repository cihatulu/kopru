-- KÖPRÜ — Perakendeci Ekip Senkronizasyon Tetikleyicisi
-- users tablosunda yapılan ekleme/güncellemeleri retailer_staff_assignments tablosuna otomatik yansıtır.

create or replace function public.sync_retailer_staff_assignments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind public.org_kind;
begin
  select kind into v_kind from public.organizations where id = new.org_id;

  if v_kind = 'retailer'::public.org_kind then
    if new.org_role in ('staff'::public.org_role, 'accountant'::public.org_role) then
      insert into public.retailer_staff_assignments (org_id, user_id, role, is_active)
      values (
        new.org_id,
        new.id,
        case when new.org_role = 'accountant'::public.org_role then 'retailer_accountant'::public.retailer_team_role else 'retailer_staff'::public.retailer_team_role end,
        new.is_active
      )
      on conflict (org_id, user_id) do update
      set role = excluded.role,
          is_active = excluded.is_active;
    else
      delete from public.retailer_staff_assignments where user_id = new.id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_user_upsert_sync_retailer_staff on public.users;
create trigger on_user_upsert_sync_retailer_staff
  after insert or update of org_role, is_active on public.users
  for each row execute function public.sync_retailer_staff_assignments();

-- Mevcut perakendeci personellerini senkronize et
insert into public.retailer_staff_assignments (org_id, user_id, role, is_active)
select 
  u.org_id,
  u.id,
  case when u.org_role = 'accountant'::public.org_role then 'retailer_accountant'::public.retailer_team_role else 'retailer_staff'::public.retailer_team_role end,
  u.is_active
from public.users u
join public.organizations o on o.id = u.org_id
where o.kind = 'retailer'::public.org_kind
  and u.org_role in ('staff'::public.org_role, 'accountant'::public.org_role)
on conflict (org_id, user_id) do nothing;

notify pgrst, 'reload schema';
