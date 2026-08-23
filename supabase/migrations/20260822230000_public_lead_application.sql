-- ============================================================
-- Public Lead Application RPC
-- Anonim ziyaretçilerin güvenle başvuru (lead) kaydetmesini sağlar.
-- ============================================================

create or replace function public.submit_lead_application(
  p_company_name text,
  p_vkn_tc text default null,
  p_kind text default null,
  p_city text default null,
  p_phone text default null,
  p_email text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_id uuid;
  v_kind public.org_kind;
  v_vkn text;
begin
  if p_company_name is null or length(btrim(p_company_name)) < 2 then
    raise exception 'Firma adı en az 2 karakter olmalıdır.';
  end if;

  if p_phone is null or length(btrim(p_phone)) < 10 then
    raise exception 'Geçerli bir telefon numarası giriniz.';
  end if;

  if p_email is null or p_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Geçerli bir e-posta adresi giriniz.';
  end if;

  if p_kind is not null and p_kind in ('manufacturer', 'retailer') then
    v_kind := p_kind::public.org_kind;
  else
    v_kind := null;
  end if;

  v_vkn := nullif(btrim(p_vkn_tc), '');
  if v_vkn is not null and not public.is_valid_vkn_tc(v_vkn) then
    raise exception 'Geçersiz VKN veya TCKN numarası.';
  end if;

  insert into public.leads (
    company_name,
    vkn_tc,
    kind,
    city,
    phone,
    email,
    source,
    status
  ) values (
    btrim(p_company_name),
    v_vkn,
    v_kind,
    nullif(btrim(p_city), ''),
    btrim(p_phone),
    lower(btrim(p_email)),
    'login_application',
    'new'
  ) returning id into v_lead_id;

  return jsonb_build_object('success', true, 'lead_id', v_lead_id);
end;
$$;

grant execute on function public.submit_lead_application to anon, authenticated;

notify pgrst, 'reload schema';
