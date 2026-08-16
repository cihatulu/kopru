-- KÖPRÜ — "Onayla" düğmesi hiç çalışmıyormuş
--
-- `respond_to_connection_request` şu satırı içeriyordu:
--
--   set status = case when p_accept then 'active' else 'passive' end
--
-- PostgreSQL `CASE`'in tipini önce dallarından çözer; iki dal da tipsiz
-- literal olduğu için sonuç `text` olur ve enum kolona atanamaz:
--
--   42804: column "status" is of type relationship_status
--          but expression is of type text
--
-- Yani gelen bağlantı isteğini onaylamak ya da reddetmek HİÇ çalışmıyordu.
-- Hata gizli kaldı çünkü 20260810060000 perakendeci→üye üretici yönünde
-- `pending` durumunu tamamen kaldırmıştı: onay ekranına düşen bir istek
-- neredeyse hiç oluşmuyordu. Onay kuralı geri gelince (20260816070000)
-- ilk denemede ortaya çıktı.
--
-- Düzeltme tek satır: `CASE` sonucu enum'a açıkça çevrilir.

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
     set status = (case when p_accept then 'active' else 'passive' end)
                    ::public.relationship_status,
         activated_at = case when p_accept then now() else activated_at end
   where id = p_relationship_id
  returning * into v_rel;

  insert into public.system_logs (actor_user_id, actor_org_id, action, entity, entity_id, meta)
  values ((select auth.uid()), v_me, 'connection.responded', 'relationships',
          p_relationship_id, jsonb_build_object('accepted', p_accept));

  return v_rel;
end;
$$;

notify pgrst, 'reload schema';
