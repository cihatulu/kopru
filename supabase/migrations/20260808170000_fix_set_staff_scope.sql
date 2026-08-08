-- set_staff_scope: INSERT sütun/değer uyuşmazlığı
--
-- HATA: Kapsam atama çağrısı canlıda
--   "INSERT has more target columns than expressions" ile düştü.
--
-- SEBEP: INSERT iki kolona yazıyordu (staff_user_id, retailer_org_id) ama
-- SELECT tek kolon üretiyordu (r.retailer_org_id). Personelin kapsamı hiçbir
-- zaman kaydedilemiyordu — yani "personel yalnız atanan müşterileri görür"
-- kuralı, atama YAPILAMADIĞI için herkesi hiçbir şey göremez durumda tutuyordu.
--
-- Bu hata testlerden geçmişti çünkü testler fonksiyonun GÖVDESİNİ metin olarak
-- denetliyordu; SQL'in çalışıp çalışmadığını yalnız canlı çağrı gösterir.

create or replace function public.set_staff_scope(
  p_staff_user_id uuid,
  p_retailer_org_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
begin
  if public.get_my_org_role() <> 'owner' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.users u where u.id = p_staff_user_id and u.org_id = v_me
  ) then
    raise exception 'STAFF_NOT_FOUND' using errcode = 'P0002';
  end if;

  delete from public.staff_scope where staff_user_id = p_staff_user_id;

  -- Yalnız GERÇEKTEN ilişkimiz olan perakendeciler atanabilir; aksi halde
  -- personele, org'un kendisinin bile göremediği bir müşteri verilebilirdi.
  insert into public.staff_scope (staff_user_id, retailer_org_id)
  select p_staff_user_id, r.retailer_org_id
    from public.relationships r
   where r.manufacturer_org_id = v_me
     and r.retailer_org_id = any(p_retailer_org_ids)
  on conflict do nothing;
end;
$$;

grant execute on function public.set_staff_scope(uuid, uuid[]) to authenticated;

notify pgrst, 'reload schema';
