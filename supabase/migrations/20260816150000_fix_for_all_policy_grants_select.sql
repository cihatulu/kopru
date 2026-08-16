-- KÖPRÜ — `FOR ALL` yazma politikası SELECT'i de açıyordu
--
-- SORUN
-- 20260816110000 ve 20260816140000 ürün ve grup için kapsamlı SELECT
-- politikaları yazdı. Doğru yazıldılar, canlıda doğru duruyorlar, kapsam
-- fonksiyonu da doğru cevap veriyor — ama misafir üretici hâlâ BÜTÜN
-- perakendecilerin ürünlerini görüyordu.
--
-- Sebep, PostgreSQL RLS'in iki kuralının birleşimi:
--   1. `FOR ALL` politikasının `USING` ifadesi SELECT'e DE uygulanır.
--   2. Aynı komut için birden çok PERMISSIVE politika varsa aralarında
--      OR vardır — biri geçerse satır görünür.
--
-- `products_write_owner` politikası `for all using (owner_org_id = benim
-- org)` şeklindeydi. Misafir üretici kendi ürünlerinin SAHİBİ olduğu için
-- bu koşul her satırda geçiyor ve kapsam koşulunu tamamen devre dışı
-- bırakıyordu. Yazma politikası, farkında olmadan bir okuma izni veriyordu.
--
-- Ekranda şöyle göründü: adnan'ın girdiği "Köşe Takımları" ile füsun'un
-- girdiği portmantolar, kenan'ın panelinde yan yana duruyordu.
--
-- ÇÖZÜM
-- Yazma politikalarının `USING` ifadesine de kapsam koşulu eklenir. Bu hem
-- okuma sızıntısını kapatır hem de doğrusu budur: bir perakendecinin
-- girdiği ürünü başka biri GÜNCELLEYEMEZ ve SİLEMEZ de.
--
-- `WITH CHECK` kapsamsız kalır: yeni satır eklenirken `managed_by` henüz
-- yazılmamış olabilir ve satırın kime ait olacağına zaten `save_product`
-- karar verir.

-- ============================================================ products
drop policy if exists products_write_owner on public.products;

create policy products_write_owner on public.products
for all
using (
  owner_org_id = (select public.get_my_org_id())
  and (select public.product_in_my_scope(products.managed_by_retailer_org_id))
)
with check (owner_org_id = (select public.get_my_org_id()));

-- ============================================================ product_groups
drop policy if exists product_groups_write_owner on public.product_groups;

create policy product_groups_write_owner on public.product_groups
for all
using (
  owner_org_id = (select public.get_my_org_id())
  and (select public.product_in_my_scope(product_groups.managed_by_retailer_org_id))
)
with check (owner_org_id = (select public.get_my_org_id()));

notify pgrst, 'reload schema';
