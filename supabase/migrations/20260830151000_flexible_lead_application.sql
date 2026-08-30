-- ============================================================
-- Flexible Public Lead Application RPC
-- Başvurularda e-posta ve VKN esnekliği (WhatsApp başvurularını tıkamaz)
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
  v_email text;
begin
  if p_company_name is null or length(btrim(p_company_name)) < 2 then
    raise exception 'Firma adı en az 2 karakter olmalıdır.';
  end if;

  if p_phone is null or length(btrim(p_phone)) < 10 then
    raise exception 'Geçerli bir telefon numarası giriniz.';
  end if;

  if p_email is not null and length(btrim(p_email)) > 0 then
    v_email := lower(btrim(p_email));
  else
    v_email := null;
  end if;

  if p_kind is not null and p_kind in ('manufacturer', 'retailer') then
    v_kind := p_kind::public.org_kind;
  else
    v_kind := null;
  end if;

  v_vkn := nullif(btrim(p_vkn_tc), '');

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
    v_email,
    'login_application',
    'new'
  ) returning id into v_lead_id;

  return jsonb_build_object('success', true, 'lead_id', v_lead_id);
end;
$$;

grant execute on function public.submit_lead_application to anon, authenticated;

notify pgrst, 'reload schema';
