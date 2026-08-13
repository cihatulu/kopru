-- KÖPRÜ — Takip sayfasında açıklamalar
--
-- Durum geçmişi yalnız etiket gösteriyordu; "üretiliyor → sevkiyat" gibi
-- geçişlerde yazılan not müşteriye ulaşmıyordu.
--
-- DİKKAT: bu not alanını ÜRETİCİ de doldurur (`advance_order_status`,
-- `ship_order_atomic`). Artık jetonu bilen herkes okuyabilir; iç yazışma
-- niteliğindeki metinler buraya yazılmamalı.
--
-- `track_order`'ın kendisi değişmiyor — yalnız yardımcı fonksiyon.

create or replace function public.track_order_history(p_order_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'status', l.to_status,
      'note', l.note,
      'created_at', l.created_at
    )
    order by l.created_at asc
  ), '[]'::jsonb)
  from public.order_status_logs l
  where l.order_id = p_order_id;
$$;

grant execute on function public.track_order_history(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
