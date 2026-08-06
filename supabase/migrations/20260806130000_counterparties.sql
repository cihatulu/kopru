-- KÖPRÜ — Faz 5: ekosistem büyütme
--
-- Köprü çağında iki abone birbirine şöyle bağlanıyordu: B'de 8 haneli eşleşme kodu
-- üretilir → perakendeciye iletilir → A kodu girer → HMAC imzalı secret alışverişi
-- yapılır → bridge_sync_log ile idempotency kurulur.
--
-- Tek veritabanında bunların HİÇBİRİ gerekmiyor. `organizations.vkn_tc` UNIQUE
-- olduğu için iki taraf da aynı düğümde yakınsar; geriye tek bir onay adımı kalır.

create type public.add_counterparty_result as (
  relationship_id uuid,
  org_id uuid,
  org_created boolean,
  status public.relationship_status,
  already_existed boolean
);

-- ============================================================ karşı taraf ekleme

create or replace function public.add_counterparty(
  p_vkn_tc text,
  p_company_name text default null,
  p_email text default null,
  p_phone text default null,
  p_authorized_name text default null,
  p_discount_rate numeric default 0
)
returns public.add_counterparty_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me public.organizations%rowtype;
  v_role public.org_role;
  v_target public.organizations%rowtype;
  v_target_kind public.org_kind;
  v_vkn text := regexp_replace(coalesce(p_vkn_tc, ''), '[\s.-]', '', 'g');
  v_rel public.relationships%rowtype;
  v_created boolean := false;
  v_status public.relationship_status;
  v_mfr uuid;
  v_rtl uuid;
begin
  select o.* into v_me
    from public.organizations o
   where o.id = public.get_my_org_id();
  if not found then
    raise exception 'NO_ORG' using errcode = '42501';
  end if;

  -- Yalnız ABONELER karşı taraf ekleyebilir; misafir kendi ekosistemini büyütemez.
  if not v_me.is_subscriber then
    raise exception 'NOT_SUBSCRIBER' using errcode = '42501';
  end if;

  v_role := public.get_my_org_role();
  if v_role not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not public.is_valid_vkn_tc(v_vkn) then
    raise exception 'INVALID_VKN' using errcode = '22023';
  end if;
  if v_vkn = v_me.vkn_tc then
    raise exception 'SELF_REFERENCE' using errcode = '22023';
  end if;

  -- A15: karşı taraf her zaman TERS tipte olur.
  v_target_kind := case v_me.kind when 'manufacturer' then 'retailer' else 'manufacturer' end;

  select o.* into v_target from public.organizations o where o.vkn_tc = v_vkn;

  if found then
    -- VKN YAKINSAMASI: kayıt zaten var, kopya AÇILMAZ (ERROR_PROTOCOLS #14).
    -- Köprünün "önce VKN, sonra e-posta, yoksa hayalet aç" heuristiği burada gereksiz.
    if v_target.kind <> v_target_kind then
      raise exception 'KIND_MISMATCH' using errcode = '22023';
    end if;
  else
    insert into public.organizations
      (kind, company_name, vkn_tc, email, phone, authorized_name,
       is_subscriber, created_by_org_id)
    values
      (v_target_kind, coalesce(nullif(btrim(p_company_name), ''), v_vkn), v_vkn,
       p_email, p_phone, p_authorized_name, false, v_me.id)
    returning * into v_target;
    v_created := true;
  end if;

  v_mfr := case when v_me.kind = 'manufacturer' then v_me.id else v_target.id end;
  v_rtl := case when v_me.kind = 'retailer'     then v_me.id else v_target.id end;

  select r.* into v_rel
    from public.relationships r
   where r.manufacturer_org_id = v_mfr and r.retailer_org_id = v_rtl;

  if found then
    -- Fikirsiz idempotency: mevcut kenarın durumu SESSİZCE değiştirilmez.
    -- Pasif bir ilişkiyi diriltmek karşı tarafın kararını geçersiz kılardı;
    -- kullanıcı bunu set_counterparty_status ile açıkça yapar.
    return (v_rel.id, v_target.id, false, v_rel.status, true)::public.add_counterparty_result;
  end if;

  -- Karşı taraf da ABONEYSE tek taraflı bağlanılamaz: onay ister.
  -- Köprünün eşleşme kodu + secret alışverişinin yerine geçen tek adım budur.
  v_status := case when v_target.is_subscriber then 'pending' else 'active' end;

  insert into public.relationships
    (manufacturer_org_id, retailer_org_id, status, initiated_by_org_id, discount_rate,
     activated_at)
  values
    (v_mfr, v_rtl, v_status, v_me.id, coalesce(p_discount_rate, 0),
     case when v_status = 'active' then now() end)
  returning * into v_rel;

  insert into public.system_logs (actor_user_id, actor_org_id, action, entity, entity_id, meta)
  values ((select auth.uid()), v_me.id, 'counterparty.added', 'relationships', v_rel.id,
          jsonb_build_object('target_org', v_target.id, 'org_created', v_created,
                             'status', v_status));

  return (v_rel.id, v_target.id, v_created, v_status, false)::public.add_counterparty_result;
end;
$$;

-- ============================================================ bağlantı isteği yanıtı

create or replace function public.respond_to_connection_request(
  p_relationship_id uuid,
  p_accept boolean
)
returns public.relationships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_rel public.relationships%rowtype;
begin
  select * into v_rel from public.relationships
   where id = p_relationship_id and status = 'pending'
   for update;
  if not found then
    raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Yalnız İSTEĞİ ALAN taraf yanıtlayabilir; isteği başlatan kendi isteğini onaylayamaz.
  if v_me not in (v_rel.manufacturer_org_id, v_rel.retailer_org_id)
     or v_me = v_rel.initiated_by_org_id then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if public.get_my_org_role() <> 'owner' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.relationships
     set status = case when p_accept then 'active' else 'passive' end,
         activated_at = case when p_accept then now() else activated_at end
   where id = p_relationship_id
  returning * into v_rel;

  insert into public.system_logs (actor_user_id, actor_org_id, action, entity, entity_id, meta)
  values ((select auth.uid()), v_me, 'connection.responded', 'relationships',
          p_relationship_id, jsonb_build_object('accepted', p_accept));

  return v_rel;
end;
$$;

-- ============================================================ kendi kenarını yönetme

create or replace function public.set_counterparty_status(
  p_relationship_id uuid,
  p_status public.relationship_status
)
returns public.relationships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_rel public.relationships%rowtype;
begin
  if p_status = 'pending' then
    raise exception 'INVALID_STATUS' using errcode = '22023';
  end if;
  if public.get_my_org_role() <> 'owner' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_rel from public.relationships where id = p_relationship_id for update;
  if not found or v_me not in (v_rel.manufacturer_org_id, v_rel.retailer_org_id) then
    raise exception 'RELATIONSHIP_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_rel.status = 'pending' then
    -- Bekleyen istek buradan değil, respond_to_connection_request ile çözülür.
    raise exception 'PENDING_REQUEST' using errcode = '22023';
  end if;

  update public.relationships
     set status = p_status,
         activated_at = case when p_status = 'active' then coalesce(activated_at, now())
                             else activated_at end
   where id = p_relationship_id
  returning * into v_rel;

  return v_rel;
end;
$$;

-- İskonto YALNIZ üretici tarafından belirlenir: kendi satış fiyatına uyguladığı indirimdir.
create or replace function public.set_counterparty_discount(
  p_relationship_id uuid,
  p_discount_rate numeric
)
returns public.relationships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_rel public.relationships%rowtype;
begin
  if p_discount_rate < 0 or p_discount_rate > 100 then
    raise exception 'INVALID_DISCOUNT' using errcode = '22023';
  end if;

  select * into v_rel from public.relationships where id = p_relationship_id for update;
  if not found or v_rel.manufacturer_org_id <> v_me then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if public.get_my_org_role() <> 'owner' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.relationships set discount_rate = p_discount_rate
   where id = p_relationship_id
  returning * into v_rel;

  return v_rel;
end;
$$;

-- ============================================================ misafirin abonelik talebi
-- PLAN §5 — tek tık yükseltmenin self-servis girişi.

create or replace function public.request_subscription(
  p_plan public.plan_tier default null,
  p_note text default null
)
returns public.subscription_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me public.organizations%rowtype;
  v_req public.subscription_requests%rowtype;
begin
  select o.* into v_me from public.organizations o where o.id = public.get_my_org_id();
  if not found then
    raise exception 'NO_ORG' using errcode = '42501';
  end if;
  if v_me.is_subscriber then
    raise exception 'ALREADY_SUBSCRIBER' using errcode = '22023';
  end if;
  if public.get_my_org_role() <> 'owner' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Açık talep varsa yenisi açılmaz (subscription_requests_open_uq ile de korunur).
  select * into v_req from public.subscription_requests
   where org_id = v_me.id and status = 'pending';
  if found then
    return v_req;
  end if;

  insert into public.subscription_requests (org_id, requested_by, requested_plan, note, status)
  values (v_me.id, public.get_my_user_id(), p_plan, p_note, 'pending')
  returning * into v_req;

  return v_req;
end;
$$;

notify pgrst, 'reload schema';
