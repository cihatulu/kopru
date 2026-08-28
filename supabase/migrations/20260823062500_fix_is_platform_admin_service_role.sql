-- KÖPRÜ — is_platform_admin service_role ve postgres kullanıcısı desteği

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins where user_id = (select auth.uid())
  )
  or (select coalesce(auth.jwt()->>'role', '') = 'service_role')
  or (current_user in ('postgres', 'service_role'));
$$;

notify pgrst, 'reload schema';
