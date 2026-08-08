-- Personel telefonu
--
-- HATA: `create-staff` çağrısı `USER_INSERT_FAILED` ile düştü — `users`
-- tablosunda `phone` kolonu yoktu ama personel formu telefon topluyordu.
--
-- Telefon org'da değil KULLANICIDA tutulmalı: servis ve sipariş süreçlerinde
-- aranan kişi org değil, o işi yürüten personeldir.
alter table public.users add column if not exists phone text;

-- NOT: `user_code` CHECK'i (`^[a-z0-9]{3,32}$`) bilerek genişletilmedi.
-- Personel kodunda tire kullanmak isterdik ama `login` Edge Function gelen
-- kodu `[\s.-]` ayraçlarından temizliyor (VKN'yi "123-456 7890" gibi yazan
-- kullanıcı için). Tireli bir kod normalize edildikten sonra HİÇBİR ZAMAN
-- eşleşmezdi. Bu yüzden personel kodu tümüyle rakamdır: <vkn><sıra>.

notify pgrst, 'reload schema';
