-- KÖPRÜ — kurucu platform admini
--
-- Tavuk-yumurta problemi: `platform_admins` tablosuna yazma politikası
-- `is_platform_admin()` gerektirir, ama ilk admin henüz yoktur. İlk satır bu
-- yüzden migration ile atılır — elle SQL değil, sürüm kontrollü ve denetlenebilir.
--
-- İdempotent ve güvenli: e-posta `auth.users` içinde yoksa hiçbir şey yapmaz,
-- hata da vermez. Kullanıcı Dashboard'dan (veya Auth Admin API ile) açıldıktan
-- sonra bu migration yeniden çalıştırılabilir.

insert into public.platform_admins (user_id, label)
select u.id, 'Kurucu admin'
  from auth.users u
 where lower(u.email) = 'cih4tulu@gmail.com'
on conflict (user_id) do nothing;

-- Doğrulama kolaylığı için: kaç admin var?
do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.platform_admins;
  raise notice 'platform_admins satir sayisi: %', v_count;
  if v_count = 0 then
    raise notice 'UYARI: Henuz platform admini yok. auth.users icinde cih4tulu@gmail.com '
                 'olusturulduktan sonra bu migration yeniden uygulanmali.';
  end if;
end;
$$;
