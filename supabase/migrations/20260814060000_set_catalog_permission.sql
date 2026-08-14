-- KÖPRÜ — Katalog düzenleme izni RPC ile çevriliyor
--
-- İstemci bu bayrağı DOĞRUDAN tabloya yazıyordu:
--   supabase.from('relationships').update({ can_edit_catalog: ... })
--
-- `relationships` üzerinde UPDATE politikası YOK — yalnız SELECT ve platform
-- admin'e ait ALL politikası var. RLS bu durumda HATA VERMEZ, sessizce 0 satır
-- günceller. İstemci başarılı sanıyor, listeyi tazeliyor, değer eski hâliyle
-- geri geliyordu: anahtar hiçbir zaman kapanmıyor ve kullanıcı sebebini
-- göremiyordu.
--
-- Aynı ekrandaki diğer iki işlem zaten RPC'den geçiyor
-- (`set_counterparty_status`, `update_counterparty_profile`); bu bayrak
-- desenin dışında kalmış. Yetki kararı sunucuda verilir.
--
-- DÖRT ŞART:
--   · Çağıran ilişkinin PERAKENDECİ tarafı olacak — üretici kendi iznini açamaz.
--   · Rol `owner`. `set_counterparty_status` ile aynı kural.
--   · Üretici MİSAFİR olacak. Abone üretici kendi kataloğunu kendi yönetir;
--     onun ürünlerine perakendecinin izniyle dokunulamaz.
--   · İlişki aktif olacak.
--
-- Varsayılan değişmiyor: kolon `not null default true`, yeni ilişki AÇIK doğar.

create or replace function public.set_catalog_permission(
  p_relationship_id uuid,
  p_can_edit boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_rel public.relationships%rowtype;
  v_manufacturer_is_subscriber boolean;
begin
  if public.get_my_org_role() <> 'owner' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_rel
    from public.relationships
   where id = p_relationship_id
   for update;

  if not found then
    raise exception 'RELATIONSHIP_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- İzni VEREN taraf perakendecidir: kendi personelinin başkasının kataloğunu
  -- düzenlemesine izin veriyor. Üretici bu anahtara erişemez.
  if v_rel.retailer_org_id <> v_me then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_rel.status <> 'active' then
    raise exception 'RELATIONSHIP_NOT_ACTIVE' using errcode = '22023';
  end if;

  select is_subscriber into v_manufacturer_is_subscriber
    from public.organizations
   where id = v_rel.manufacturer_org_id;

  if coalesce(v_manufacturer_is_subscriber, false) then
    raise exception 'MANUFACTURER_IS_SUBSCRIBER' using errcode = '22023';
  end if;

  update public.relationships
     set can_edit_catalog = p_can_edit
   where id = v_rel.id;

  -- Yetki değişikliği iz bırakır: kimin ne zaman neyi açtığı sorulabilmeli.
  insert into public.system_logs (actor_user_id, actor_org_id, action, entity, entity_id, meta)
  values ((select auth.uid()), v_me,
          case when p_can_edit then 'catalog_permission.granted' else 'catalog_permission.revoked' end,
          'relationships', v_rel.id,
          jsonb_build_object('manufacturer_org_id', v_rel.manufacturer_org_id));
end;
$$;

grant execute on function public.set_catalog_permission(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
