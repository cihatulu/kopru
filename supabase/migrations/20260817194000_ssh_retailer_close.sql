-- ============================================================
-- SSH Akışı — Perakendeci Kapatma Yetkisi
-- ============================================================
--
-- Mevcut kural: perakendeci yalnızca 'iptal' yapabilir.
-- Yeni kural:
--   - 'parca_gonderildi' → 'tamamlandi': perakendeci de yapabilir
--     (parçayı aldığını onaylar, akışı kapatır)
--   - 'bekliyor' → 'iptal': perakendeci yapabilir (zaten mevcut)
--   - Diğer tüm geçişler: sadece üretici

create or replace function public.advance_ssh_status(
  p_id     uuid,
  p_status public.ssh_status,
  p_note   text default null
)
returns public.ssh_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me  uuid := public.get_my_org_id();
  v_row public.ssh_requests%rowtype;
  v_from public.ssh_status;
begin
  select * into v_row from public.ssh_requests where id = p_id for update;
  if not found then
    raise exception 'SSH_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Yetki kontrolü:
  --   'iptal'      → üretici veya perakendeci
  --   'tamamlandi' → üretici veya perakendeci (parçayı aldım onayı)
  --   diğerleri    → sadece üretici
  if p_status in ('iptal', 'tamamlandi') then
    if v_me not in (v_row.manufacturer_org_id, v_row.retailer_org_id) then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    -- Perakendeci 'tamamlandi' yapabilmek için akış 'parca_gonderildi' olmalı
    if p_status = 'tamamlandi'
       and v_me = v_row.retailer_org_id
       and v_row.status <> 'parca_gonderildi' then
      raise exception 'INVALID_TRANSITION' using errcode = '22023';
    end if;
  elsif v_row.manufacturer_org_id <> v_me then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_row.status in ('tamamlandi', 'iptal') then
    raise exception 'SSH_CLOSED' using errcode = '22023';
  end if;

  v_from := v_row.status;

  update public.ssh_requests set status = p_status where id = p_id
  returning * into v_row;

  insert into public.ssh_status_logs
    (ssh_id, manufacturer_org_id, retailer_org_id, from_status, to_status, note,
     actor_user_id, actor_org_id)
  values
    (v_row.id, v_row.manufacturer_org_id, v_row.retailer_org_id, v_from, p_status,
     nullif(btrim(coalesce(p_note, '')), ''), public.get_my_user_id(), v_me);

  return v_row;
end;
$$;

grant execute on function public.advance_ssh_status(uuid, public.ssh_status, text) to authenticated;
