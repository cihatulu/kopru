-- KÖPRÜ — Cari hareketlerde sponsor kapsamı ve ölçek düzeltmesi
--
-- Mevcut politika:
--   is_platform_admin() or relationship_id in (select id from relationships)
--
-- İKİ SORUN
--
-- 1) KİLİTLİ KURAL 9 İHLALİ
-- `relationship_id in (select ... from relationships)` deseni bu projede
-- açıkça YASAK. Hedef ölçek ~500.000 ilişki; her cari satırı için bu alt
-- sorgu çalıştığında liste çöker. RLS anahtarı denormalize taşınan
-- `manufacturer_org_id` / `retailer_org_id` kolonları üzerinden EŞİTLİKLE
-- kurulur — `transactions` bu kolonların ikisini de zaten taşıyor.
--
-- 2) SPONSOR KAPSAMI EKSİK
-- Sipariş, iade ve SSH politikalarının hepsinde sponsor koşulu var; caride
-- yoktu. Sonuç: misafir üretici A ile giriş yaptığında A'nın siparişlerini
-- görüyor ama BÜTÜN carilerini görüyordu.
--
-- Bu tutarsızlık ürünün iş modeline aykırı. Misafir, kendisini ekleyen her
-- karşı taraf için ayrı ayrı giriş yapar ve o girişte YALNIZ o tarafın işini
-- yürütür. Hepsini tek panelde görmek ÜYELİĞİN karşılığıdır — cari bunu
-- bedava veriyordu.
--
-- Üye tarafta hiçbir şey değişmez: `get_my_sponsor_org_id()` üyede NULL
-- döner ve koşul her satırda geçer.

drop policy if exists transactions_select_own_side on public.transactions;

create policy transactions_select_own_side on public.transactions
for select
using (
  (select public.is_platform_admin())
  or (
    -- Denormalize kolonlar üzerinden eşitlik (kilitli kural 9).
    (
      manufacturer_org_id = (select public.get_my_org_id())
      or retailer_org_id = (select public.get_my_org_id())
    )
    -- Misafir isem yalnız sponsorumla olan hareketler; üyede bu koşul
    -- kendiliğinden geçer.
    and (
      public.get_my_sponsor_org_id() is null
      or manufacturer_org_id = public.get_my_sponsor_org_id()
      or retailer_org_id = public.get_my_sponsor_org_id()
    )
  )
);

-- Politika artık bu iki kolonu süzüyor; indeks ölçekte gereklidir.
create index if not exists transactions_manufacturer_org_idx
  on public.transactions (manufacturer_org_id, created_at desc);
create index if not exists transactions_retailer_org_idx
  on public.transactions (retailer_org_id, created_at desc);

notify pgrst, 'reload schema';
