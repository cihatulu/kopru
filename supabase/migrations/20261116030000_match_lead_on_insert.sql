-- Aday eklenirken VKN'si zaten kayıtlı bir firmayla eşleştirilir.
--
-- BULGU (16 Kasım 2026): `match_lead_to_org()` yalnız organizations INSERT'inde
-- çalışıyordu. Firma ÖNCE açılıp aday SONRA aynı VKN'yle eklenince (ör. misafir
-- üretici DARDASON, ardından aday RAVİZZA YBB — VKN 40000000043) aday eşleşmiyor,
-- listede "Üretici Ekle" düğmesi çıkıyor, tıklanınca organizations_vkn_tc_key
-- ihlali ham hata olarak gösteriliyordu.
--
-- Kural, mevcut tetikleyiciyle aynı: VKN'si kayıtlı bir firmayla eşleşen aday
-- "müşteri oldu" (converted) sayılır ve o firmaya bağlanır.

create or replace function public.match_lead_to_existing_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if new.vkn_tc is null or new.matched_org_id is not null then
    return new;
  end if;

  select o.id into v_org_id
    from public.organizations o
   where o.vkn_tc = new.vkn_tc;

  if found then
    new.matched_org_id := v_org_id;
    new.status := 'converted';
  end if;
  return new;
end;
$$;

-- Tetikleyici fonksiyonu: istemciden çağrılmaz (ERROR_PROTOCOLS #36).
revoke execute on function public.match_lead_to_existing_org() from public, anon, authenticated;

drop trigger if exists leads_match_existing_org on public.leads;
create trigger leads_match_existing_org
  before insert or update of vkn_tc on public.leads
  for each row execute function public.match_lead_to_existing_org();

-- Mevcut adaylar: firması önceden açılmış ama eşleşmemiş olanlar.
update public.leads l
   set matched_org_id = o.id,
       status = 'converted'
  from public.organizations o
 where o.vkn_tc = l.vkn_tc
   and l.matched_org_id is null;

notify pgrst, 'reload schema';
