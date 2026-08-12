-- Misafir oturum izolasyonu
--
-- SORUN: Bir misafir N farklı sponsorla ilişki kurabilir.
-- Giriş yaparken hangi sponsorla girdiği login Edge Function'da doğrulanıyor
-- ama JWT'ye yazılmıyor. Bu yüzden RLS tüm sponsor ilişkilerini gösteriyor.
--
-- ÇÖZÜM:
--   1. login Edge Function başarılı misafir girişinde auth.users.raw_app_meta_data'ya
--      { sponsor_org_id: uuid } yazar (bu iş migration'ın dışında — bkz. login/index.ts).
--   2. get_my_sponsor_org_id() JWT'den bu claim'i okur.
--   3. relationships RLS politikası misafiri yalnız sponsor'uyla olan ilişkiye kilitler.
--   4. shares_relationship_with() aynı şekilde güncellenir.

-- ============================================================ 1. Yeni helper

create or replace function public.get_my_sponsor_org_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  -- Misafir olmayan kullanıcılarda bu claim yok → NULL döner.
  -- NULL olunca caller'lar "abone" yolunu izler.
  select nullif(
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'sponsor_org_id',
      auth.jwt() ->> 'sponsor_org_id'
    ),
    ''
  )::uuid;
$$;

-- ============================================================ 2. shares_relationship_with güncelleme
--
-- Misafir iken: kendi org_id'si + sponsor_org_id → birlikte ikili ilişkiyi tanımlar.
-- Abone iken  : sadece kendi org_id'si yeterli (get_my_sponsor_org_id() NULL döner).

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
     where r.status = 'active'
       and (
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

-- ============================================================ 3. relationships RLS güncelleme

drop policy if exists "relationships_select_own_side" on public.relationships;

create policy "relationships_select_own_side"
  on public.relationships for select to authenticated
  using (
    (select public.is_platform_admin())
    or (
      -- Kullanıcının kendi org'u ilişkinin bir tarafı olmalı
      (manufacturer_org_id = (select public.get_my_org_id())
       or retailer_org_id  = (select public.get_my_org_id()))
      -- Misafir ise: sponsor_org_id de ilişkide olmalı (diğer taraf)
      and (
        (select public.get_my_sponsor_org_id()) is null
        or manufacturer_org_id = (select public.get_my_sponsor_org_id())
        or retailer_org_id     = (select public.get_my_sponsor_org_id())
      )
    )
  );

-- ============================================================ 4. transactions RLS — sponsor izolasyonu
--
-- Mevcut "transactions_select_own_side" politikası kaldırılıp yerine
-- sponsor izolasyonu eklenmiş yeni politika konur.

drop policy if exists "transactions_select_own_side" on public.transactions;

create policy "transactions_select_own_side"
  on public.transactions for select to authenticated
  using (
    (select public.is_platform_admin())
    or (
      (manufacturer_org_id = (select public.get_my_org_id())
       or retailer_org_id  = (select public.get_my_org_id()))
      and (
        -- Abone ise sponsor claim yok → tüm kendi ilişkileri görür
        (select public.get_my_sponsor_org_id()) is null
        -- Misafir ise: yalnız sponsor'un olduğu satırlar
        or manufacturer_org_id = (select public.get_my_sponsor_org_id())
        or retailer_org_id     = (select public.get_my_sponsor_org_id())
      )
    )
  );

-- ============================================================ 5. orders RLS — sponsor izolasyonu
--
-- Mevcut "orders_select_own_side" politikası aynı şekilde güncellenir.

drop policy if exists "orders_select_own_side" on public.orders;

create policy "orders_select_own_side"
  on public.orders for select to authenticated
  using (
    (select public.is_platform_admin())
    or (
      (manufacturer_org_id = (select public.get_my_org_id())
       or retailer_org_id  = (select public.get_my_org_id()))
      and (
        (select public.get_my_sponsor_org_id()) is null
        or manufacturer_org_id = (select public.get_my_sponsor_org_id())
        or retailer_org_id     = (select public.get_my_sponsor_org_id())
      )
    )
  );

-- order_items, order_status_logs sponsor izolasyonunu orders üzerinden zaten devralır
-- (using exists(select 1 from orders where ...)) — ek politika gerekmiyor.

notify pgrst, 'reload schema';
