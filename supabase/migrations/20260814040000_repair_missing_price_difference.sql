-- KÖPRÜ — Farkı eksik yazılmış tek siparişin perakende fiyatı onarılıyor
--
-- `20260814020000` farkı KATMAN 2'ye taşırken sunucudaki toplamayı kaldırdı;
-- istemci devralana kadar geçen aralıkta verilen siparişlerde
-- `retail_unit_price` farksız yazıldı. Etkilenen tek kayıt `260814-0003`:
-- üreticiye 25.000 borç yazılmış ama müşteri tarafı 40.000 kalmış.
--
-- ID İLE HEDEFLENİYOR, kural ile değil. "Fark dahil mi değil mi" bir tutara
-- bakarak ayırt edilemez; genel bir UPDATE, farkı zaten içeren kayıtlara ikinci
-- kez ekleyip 0001 ve 0002'yi bozardı.
--
-- LEDGER'A DOKUNULMUYOR (kural 7). Bu KATMAN 3'tür; üretici carisindeki 25.000
-- borç en baştan doğruydu ve olduğu gibi kalıyor.
--
-- Sıfır ortamda (db reset) hiçbir satır eşleşmez; idempotenttir.

update public.order_item_retail_prices
   set retail_unit_price = 45000
 where order_item_id = 'cc139bc1-03a7-4579-993a-bfc6f6e2f77b'
   and retail_unit_price = 40000;
