-- KÖPRÜ — Duyuru gizleme (perakendeci kendi listesinden kaldırır)
--
-- Perakendeci bir duyuruyu "sil" butonuyla kaldırdığında, üreticinin
-- duyurusunu DB'den silmek yerine yalnız kendi okuma kaydını dismissed=true
-- yapar. Bu sayede RLS bypass'e gerek kalmaz, diğer perakendeciler etkilenmez.

alter table public.announcement_reads
  add column if not exists dismissed boolean not null default false;

-- dismissed=true olanları hızlı filtreleyelim
create index if not exists announcement_reads_dismissed_idx
  on public.announcement_reads (retailer_org_id)
  where dismissed = true;

notify pgrst, 'reload schema';
