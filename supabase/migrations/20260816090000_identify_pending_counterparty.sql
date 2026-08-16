-- KÖPRÜ — Bekleyen ve pasif karşı taraf TANINABİLİR olmalı
--
-- SORUN
-- `shares_relationship_with()` yalnız `status = 'active'` ilişkileri sayıyordu.
-- Sonuç: `organizations` satırı görünmediği için karşı tarafın adı ve VKN'si
-- ekranda "—" olarak çiziliyordu. Üç yerde birden kördü:
--
--   1. "Gelen bağlantı istekleri" — üretici KİMİN istek gönderdiğini
--      göremeden Onayla/Reddet'e basıyordu.
--   2. "Bekleyen giden istekler" — perakendeci KİME istek gönderdiğini
--      göremiyordu.
--   3. Pasif üretici/müşteri listesi — hangi firmayı KALICI SİLDİĞİNİ
--      göremiyordu; onay penceresi de firma adını yazmıyor.
--
-- Bu, bağlantı onayı akışını işlevsiz bırakıyordu: tanımadığın bir tarafla
-- ticari ilişki kurup kurmayacağına karar veremezsin.
--
-- NEDEN GÜVENLİ
-- İlişki satırı zaten VARSA iki org birbirini biliyor: isteği başlatan taraf
-- karşı tarafın VKN'sini tam olarak yazmış ve `lookup_org_by_vkn` ona firma
-- adını zaten döndürmüştür. Kimliği gizlemek kimseyi korumuyor, yalnız onayı
-- ve silmeyi kör yapıyordu.
--
-- İlişkinin YETKİLERİ (katalog, sipariş, cari, stok) ayrı politikalarla ve
-- hâlâ `status = 'active'` koşuluyla korunuyor. Bu fonksiyon YALNIZCA karşı
-- tarafın kimlik kartını görünür kılar.
--
-- Misafir yalıtımı KORUNUYOR: sponsor koşulu olduğu gibi kalır, misafir
-- yalnız kendi sponsoruyla olan ilişkinin karşı tarafını görebilir.
--
-- Kapsam: bu fonksiyon TEK bir politikada kullanılıyor
-- (`organizations_select_self_or_counterparty`), başka yeri etkilemez.

create or replace function public.shares_relationship_with(p_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.relationships r
     where (
         -- Abone modu: sadece kendi org'u
         (r.manufacturer_org_id = public.get_my_org_id() and r.retailer_org_id = p_org_id)
         or
         (r.retailer_org_id = public.get_my_org_id() and r.manufacturer_org_id = p_org_id)
       )
       -- Misafir ise: ilişki aynı zamanda sponsor ile benim aramda olmalı
       and (
         public.get_my_sponsor_org_id() is null
         or r.manufacturer_org_id = public.get_my_sponsor_org_id()
         or r.retailer_org_id     = public.get_my_sponsor_org_id()
       )
  );
$$;

notify pgrst, 'reload schema';
