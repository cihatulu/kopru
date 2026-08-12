-- Perakendeci personelleri (satış/muhasebe) artık üretici modülünde olduğu gibi 
-- doğrudan 'users' tablosundan sorgulandığı için karmaşık olan 
-- retailer_staff_assignments tablosuna ve senkronizasyon tetikleyicisine gerek kalmamıştır.

-- Senkronizasyon fonksiyonunu ve tetikleyiciyi kaldır
drop trigger if exists on_user_upsert_sync_retailer_staff on public.users;
drop function if exists public.sync_retailer_staff_assignments();

-- Zaten kullanılmayan davetler tablosunu temizle
drop table if exists public.retailer_invitations;

-- Ara tabloyu tamamen kaldır
drop table if exists public.retailer_staff_assignments;

-- Davet / Rol enum tipini silmek için
drop type if exists public.retailer_team_role cascade;

notify pgrst, 'reload schema';
