-- KÖPRÜ — Plan gating kaldırıldı (tüm modüller herkese açık)
--
-- Karar: free / basic / pro ayrımı kaldırılıyor. Tüm aboneler tüm modüllere
-- erişebilir. Şema değişmez (plan_tier enum, organizations.plan kolonu kalır —
-- is_subscriber = (plan is not null) CHECK kırılmasın); yalnız davranış değişir.
--
-- Üç şey yapılır:
--   1. default_modules_for_plan() — tüm planlar için FULL modül listesi döner.
--   2. relationship_has_module()  — her zaman TRUE döner (sunucu gating kaldırıldı).
--   3. Mevcut tüm subscriber org'ların enabled_modules güncellenir (tam liste).

-- ============================================================ 1. plan → modüller

create or replace function public.default_modules_for_plan(p_plan public.plan_tier)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select '[
    "dashboard","catalog","orders","accounts","counterparties",
    "stock","reports","announcements","ssh","returns",
    "team","finance","campaigns","roomStaging"
  ]'::jsonb;
$$;

-- ============================================================ 2. modül gating — her zaman açık

create or replace function public.relationship_has_module(
  p_relationship_id uuid,
  p_module text
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select true;
$$;

-- ============================================================ 3. Mevcut org'ları güncelle

update public.organizations
   set enabled_modules = '[
     "dashboard","catalog","orders","accounts","counterparties",
     "stock","reports","announcements","ssh","returns",
     "team","finance","campaigns","roomStaging"
   ]'::jsonb
 where is_subscriber = true;

-- Misafir org'lar da aynı modüllere erişsin
update public.organizations
   set enabled_modules = '[
     "dashboard","catalog","orders","accounts","counterparties",
     "stock","reports","announcements","ssh","returns",
     "team","finance","campaigns","roomStaging"
   ]'::jsonb
 where is_subscriber = false;

notify pgrst, 'reload schema';
