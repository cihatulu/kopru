-- Perakendeci, tedarikçisinin stok adedini görebilir
--
-- NEDEN: Katalog ekranı ürün kartında "Stok: 17" göstermek zorunda — bayi
-- sipariş vermeden önce ürünün elde olup olmadığını bilmeli. Şu anki politika
-- yalnız sahibine izin verdiği için kart her üründe "kayıt yok" gösteriyordu.
--
-- SINIR: Yalnız ARAMIZDA AKTİF İLİŞKİ olan üreticinin stoğu görünür. İlişkisi
-- olmayan bir perakendeci hiçbir şey göremez; pasife alınmış bir ilişki de
-- görünürlüğü kapatır. Bu, üreticinin stok bilgisini rakiplerine değil yalnız
-- kendi bayilerine açar.
--
-- Bu bir GÖRÜNÜRLÜK genişletmesidir; yazma yetkisi DEĞİŞMEZ — istemci bu
-- tabloya hâlâ yazamaz (kilitli kural 14).

create policy "manufacturer_stock_select_active_dealer"
on public.manufacturer_stock for select to authenticated
using (
  exists (
    select 1
      from public.relationships r
     where r.manufacturer_org_id = manufacturer_stock.owner_org_id
       and r.retailer_org_id = (select public.get_my_org_id())
       and r.status = 'active'
  )
);
