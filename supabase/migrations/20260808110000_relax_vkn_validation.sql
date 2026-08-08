-- KÖPRÜ — VKN / TCKN algoritma doğrulaması kaldırıldı
--
-- Karar: checksum tabanlı doğrulama sadece format kontrolüne indiriliyor.
--   • 10 haneli sayı → VKN olarak kabul edilir
--   • 11 haneli, ilk hanesi 0 olmayan sayı → TCKN olarak kabul edilir
-- Bu sayede test ve geliştirme ortamında rasgele numaralar kullanılabilir.
--
-- organizations.vkn_tc üzerindeki CHECK constraint aynı is_valid_vkn_tc()
-- fonksiyonunu çağırdığından fonksiyonları değiştirmek yeterlidir.

create or replace function public.is_valid_tckn(p text)
returns boolean
language sql
immutable
set search_path = public
as $$
  -- Sadece format: 11 hane, ilk hane 1-9
  select p ~ '^[1-9][0-9]{10}$';
$$;

create or replace function public.is_valid_vkn(p text)
returns boolean
language sql
immutable
set search_path = public
as $$
  -- Sadece format: tam 10 rakam
  select p ~ '^[0-9]{10}$';
$$;

-- is_valid_vkn_tc değişmiyor; is_valid_vkn OR is_valid_tckn zaten doğru.

notify pgrst, 'reload schema';
