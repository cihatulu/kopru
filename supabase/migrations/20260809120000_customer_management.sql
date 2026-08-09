-- KÖPRÜ — müşteri yönetimi: VKN önden sorgu ve müşteri kartı düzenleme
--
-- A3'ün arayüz karşılığı: VKN yakınsama anahtarıdır. Kullanıcı yeni müşteri
-- açarken numarayı yazdığı anda "bu firma zaten var mı" sorusunun cevabını
-- görmeli — yoksa kopya kayıt açmaya çalışır, sunucu 23505 ile reddeder ve
-- kullanıcı ne olduğunu anlamaz.

create type public.org_lookup_result as (
  found boolean,
  org_id uuid,
  company_name text,
  kind public.org_kind,
  is_subscriber boolean,
  /** Aramızda kenar varsa durumu; yoksa null. */
  relationship_status public.relationship_status,
  /** Karşı tarafın giriş hesabı var mı — varsa şifre/kod alanları gösterilmez. */
  has_login boolean
);

/**
 * VKN ile organizasyon arar.
 *
 * RLS ile YAPILAMAZ: `organizations` politikası yalnız kendi org'umu ve
 * ilişkili olduklarımı gösterir; oysa sorunun amacı tam da "henüz ilişkim
 * olmayan bir firma zaten kayıtlı mı" sorusudur. Bu yüzden SECURITY DEFINER.
 *
 * Dönen alanlar bilerek DAR: firma adı, tipi, abone olup olmadığı. Bunlar
 * ticari sicilde zaten açık bilgilerdir; e-posta, telefon, adres DÖNMEZ.
 * Çağıran abone bir org olmak zorunda.
 */
create or replace function public.lookup_org_by_vkn(p_vkn_tc text)
returns public.org_lookup_result
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_me public.organizations%rowtype;
  v_vkn text := regexp_replace(coalesce(p_vkn_tc, ''), '[\s.-]', '', 'g');
  v_target public.organizations%rowtype;
  v_out public.org_lookup_result;
begin
  select o.* into v_me from public.organizations o where o.id = public.get_my_org_id();
  if not found then
    raise exception 'NO_ORG' using errcode = '42501';
  end if;
  if not v_me.is_subscriber then
    raise exception 'NOT_SUBSCRIBER' using errcode = '42501';
  end if;

  v_out.found := false;
  if not public.is_valid_vkn_tc(v_vkn) then
    return v_out;
  end if;

  select o.* into v_target from public.organizations o where o.vkn_tc = v_vkn;
  if not found then
    return v_out;
  end if;

  v_out.found := true;
  v_out.org_id := v_target.id;
  v_out.company_name := v_target.company_name;
  v_out.kind := v_target.kind;
  v_out.is_subscriber := v_target.is_subscriber;

  select r.status into v_out.relationship_status
    from public.relationships r
   where (r.manufacturer_org_id = v_me.id and r.retailer_org_id = v_target.id)
      or (r.retailer_org_id = v_me.id and r.manufacturer_org_id = v_target.id);

  v_out.has_login := exists (
    select 1 from public.users u where u.org_id = v_target.id and u.org_role = 'owner'
  );

  return v_out;
end;
$$;

grant execute on function public.lookup_org_by_vkn(text) to authenticated;

-- ============================================================ kart düzenleme

/**
 * Müşterinin (misafir org'un) firma bilgilerini günceller.
 *
 * YALNIZ MİSAFİR: abone bir perakendeci de müşteriniz olabilir, ama onun
 * firma kartı KENDİSİNE aittir. Sponsorun onu düzenleyebilmesi, başka bir
 * firmanın kaydını değiştirmek olurdu.
 *
 * İskonto ayrıca `set_counterparty_discount` ile yönetilir; o ilişkiye ait
 * bir alandır, org'a değil.
 */
create or replace function public.update_counterparty_profile(
  p_org_id uuid,
  p_company_name text default null,
  p_authorized_name text default null,
  p_email text default null,
  p_phone text default null,
  p_address text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_target public.organizations%rowtype;
begin
  if public.get_my_org_role() not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select o.* into v_target from public.organizations o where o.id = p_org_id for update;
  if not found then
    raise exception 'ORG_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Abone org kendi kartının sahibidir.
  if v_target.is_subscriber then
    raise exception 'TARGET_IS_SUBSCRIBER' using errcode = '42501';
  end if;

  -- Yalnız GERÇEKTEN müşterim olan bir misafir düzenlenebilir.
  if not exists (
    select 1 from public.relationships r
     where (r.manufacturer_org_id = v_me and r.retailer_org_id = p_org_id)
        or (r.retailer_org_id = v_me and r.manufacturer_org_id = p_org_id)
  ) then
    raise exception 'NOT_MY_COUNTERPARTY' using errcode = '42501';
  end if;

  update public.organizations
     set company_name = coalesce(nullif(btrim(p_company_name), ''), company_name),
         authorized_name = coalesce(nullif(btrim(p_authorized_name), ''), authorized_name),
         email = coalesce(nullif(btrim(p_email), ''), email),
         phone = coalesce(nullif(btrim(p_phone), ''), phone),
         address = coalesce(nullif(btrim(p_address), ''), address)
   where id = p_org_id;

  insert into public.system_logs (actor_user_id, actor_org_id, action, entity, entity_id, meta)
  values ((select auth.uid()), v_me, 'counterparty.profile_updated', 'organizations', p_org_id,
          '{}'::jsonb);
end;
$$;

grant execute on function public.update_counterparty_profile(uuid, text, text, text, text, text)
  to authenticated;

notify pgrst, 'reload schema';
