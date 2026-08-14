-- KÖPRÜ — Özel talep farkı takip sayfasında da görünüyor
--
-- `track_order_items` yalnız talep METNİNİ döndürüyordu: müşteri "kapılar cam
-- olsun" yazısını görüyor ama bunun tutara +5.000 olarak bindiğini göremiyordu.
-- Tutar doğru olduğu hâlde kırılım görünmeyince sayı açıklamasız kalıyor.
--
-- `unit_price` ZATEN her şey dahildir (`retail_unit_price` = taban + fark);
-- `price_difference` yalnız KIRILIM içindir, toplama tekrar eklenmez.
--
-- Sızıntı yok: dönen fark KATMAN 2'nin ek ücreti değil, müşterinin ödediği
-- tutarın içindeki kalemdir ve müşteri zaten kendi faturasını görür. Üretici
-- maliyeti ve perakendeci kârı hâlâ dönmüyor (A4).
--
-- İmza değişmiyor; `create or replace` yeterli (kural 6).

create or replace function public.track_order_items(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'productId', oi.product_id,
      'name', oi.product_snapshot->>'name',
      'quantity', oi.quantity,
      'unit_price', coalesce(rp.retail_unit_price, 0),
      'total_price', round(coalesce(rp.retail_unit_price, 0) * oi.quantity, 2),
      'custom_description', oi.custom_description,
      'price_difference', oi.price_difference
    )
  ), '[]'::jsonb)
  from public.order_items oi
  left join public.order_item_retail_prices rp on rp.order_item_id = oi.id
  where oi.order_id = p_order_id;
$$;

grant execute on function public.track_order_items(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
