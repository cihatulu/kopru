-- Davet token'ı: pgcrypto yerine çekirdek gen_random_uuid()
--
-- HATA: `create_invitation` çağrısı canlıda
--   "function gen_random_bytes(integer) does not exist" ile düştü.
--
-- SEBEP: `gen_random_bytes` pgcrypto'ya aittir ve Supabase pgcrypto'yu
-- `extensions` şemasına kurar. Fonksiyon `set search_path = public` ile
-- çalıştığı için (kilitli kural 4) o şema görünmez. `create extension if not
-- exists pgcrypto` satırı da bunu düzeltmez — eklenti zaten kurulu olduğu için
-- ifade sessizce hiçbir şey yapmaz.
--
-- ÇÖZÜM: `extensions.` ile niteleme YERİNE bağımlılığı tamamen kaldırmak.
-- `gen_random_uuid()` PostgreSQL 13+ çekirdeğindedir (pg_catalog), search_path
-- ne olursa olsun görünür. İki UUID'nin tiresiz birleşimi 64 karakterlik hex
-- token verir — 244 bit rastgelelik, ayrıca doğası gereği URL-güvenli.

create or replace function public.create_invitation(
  p_company_name text default null,
  p_email text default null,
  p_phone text default null,
  p_authorized_name text default null,
  p_vkn_tc text default null,
  p_discount_rate numeric default 0,
  p_valid_days int default 14
)
returns public.invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me public.organizations%rowtype;
  v_role public.org_role;
  v_vkn text := nullif(regexp_replace(coalesce(p_vkn_tc, ''), '[\s.-]', '', 'g'), '');
  v_days int := least(greatest(coalesce(p_valid_days, 14), 1), 90);
  v_row public.invitations;
begin
  select o.* into v_me from public.organizations o where o.id = public.get_my_org_id();
  if not found then
    raise exception 'NO_ORG' using errcode = '42501';
  end if;

  if not v_me.is_subscriber then
    raise exception 'NOT_SUBSCRIBER' using errcode = '42501';
  end if;

  v_role := public.get_my_org_role();
  if v_role not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_vkn is not null then
    if not public.is_valid_vkn_tc(v_vkn) then
      raise exception 'INVALID_VKN' using errcode = '22023';
    end if;
    if v_vkn = v_me.vkn_tc then
      raise exception 'SELF_REFERENCE' using errcode = '22023';
    end if;
  end if;

  insert into public.invitations
    (token, inviter_org_id, created_by_user_id, company_name, email, phone,
     authorized_name, vkn_tc, discount_rate, expires_at)
  values
    (replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
     v_me.id, public.get_my_user_id(),
     nullif(btrim(p_company_name), ''), nullif(btrim(p_email), ''),
     nullif(btrim(p_phone), ''), nullif(btrim(p_authorized_name), ''),
     v_vkn, coalesce(p_discount_rate, 0), now() + make_interval(days => v_days))
  returning * into v_row;

  insert into public.system_logs (actor_user_id, actor_org_id, action, entity, entity_id, meta)
  values ((select auth.uid()), v_me.id, 'invitation.created', 'invitations', v_row.id,
          jsonb_build_object('vkn_locked', v_vkn is not null));

  return v_row;
end;
$$;

notify pgrst, 'reload schema';
