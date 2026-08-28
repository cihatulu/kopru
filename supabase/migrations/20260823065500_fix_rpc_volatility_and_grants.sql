-- KÖPRÜ — RPC volatility ve permissions düzeltmeleri (TestSprite & PostgREST uyumu)

alter function public.manufacturer_summary(date, date) stable;
alter function public.retailer_summary(date, date) stable;
alter function public.current_balance(uuid) stable;
alter function public.is_valid_vkn(text) immutable;
alter function public.is_valid_vkn_tc(text) immutable;

grant execute on function public.is_valid_vkn(text) to anon, authenticated;
grant execute on function public.is_valid_vkn_tc(text) to anon, authenticated;
grant execute on function public.get_my_org_role() to authenticated;
grant execute on function public.current_balance(uuid) to authenticated;
grant execute on function public.manufacturer_summary(date, date) to authenticated;
grant execute on function public.retailer_summary(date, date) to authenticated;
grant execute on function public.track_order(uuid) to anon, authenticated;
grant execute on function public.track_order_history(uuid) to anon, authenticated;
grant execute on function public.track_order_items(uuid) to anon, authenticated;
grant execute on function public.track_order_returns(uuid) to anon, authenticated;
grant execute on function public.set_product_stock(uuid, numeric) to authenticated;
grant execute on function public.product_in_my_scope(uuid) to authenticated;
grant execute on function public.assign_products_to_group(uuid[], uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
