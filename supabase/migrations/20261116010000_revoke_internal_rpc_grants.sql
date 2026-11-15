-- İç yardımcı SECURITY DEFINER fonksiyonları istemci rollerine kapatılır.
--
-- BULGU (16 Kasım 2026): Postgres her yeni fonksiyona PUBLIC'e EXECUTE verir;
-- PostgREST de public şemadaki her fonksiyonu /rpc altında yayınlar. Aşağıdaki
-- 10 fonksiyonun gövdesinde kimlik kontrolü YOK ve giriş yapmamış ziyaretçi
-- (anon, publishable anahtar herkese açık) bunları doğrudan çağırabiliyordu:
--
--   check_staff_password_conflict  → org kullanıcılarına karşı şifre tahmini;
--                                    login kilit sayacını atlar (KRİTİK)
--   open_group_scope_for_org       → perakendecinin yönettiği grupları herkese açar
--   merge_duplicate_products       → başka org'un kataloğunu değiştirir
--   recalculate_relationship_balances → başka carinin balance_after'ını yeniden yazar
--   current_balance                → cari kimliğiyle bakiye okuma (çapraz kiracı)
--   track_order_history/items/returns → token'sız, sipariş kimliğiyle perakende fiyat
--   next_order_no                  → sipariş numarası harcatma
--   relationship_has_module        → zararsız ama iç yardımcı
--
-- Meşru çağıranlar etkilenmez:
--   * check_staff_password_conflict yalnız Edge Function'lardan, service_role ile.
--   * Diğerleri yalnız SECURITY DEFINER fonksiyonların İÇİNDEN çağrılır
--     (track_order, place_order_atomic, upgrade_org_to_subscriber,
--      update/delete_manual_transaction, create_return_request) — bunlar
--     fonksiyon sahibinin yetkisiyle çalışır.
-- Herkese açık kalması gerekenler (track_order, submit_lead_application) bu
-- listede DEĞİLDİR.

revoke execute on function public.check_staff_password_conflict(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.open_group_scope_for_org(uuid)                  from public, anon, authenticated;
revoke execute on function public.merge_duplicate_products(uuid)                  from public, anon, authenticated;
revoke execute on function public.recalculate_relationship_balances(uuid)         from public, anon, authenticated;
revoke execute on function public.current_balance(uuid)                           from public, anon, authenticated;
revoke execute on function public.track_order_history(uuid)                       from public, anon, authenticated;
revoke execute on function public.track_order_items(uuid)                         from public, anon, authenticated;
revoke execute on function public.track_order_returns(uuid)                       from public, anon, authenticated;
revoke execute on function public.next_order_no(uuid)                             from public, anon, authenticated;
revoke execute on function public.relationship_has_module(uuid, text)             from public, anon, authenticated;

-- service_role (Edge Function) erişimi açıkça korunur.
grant execute on function public.check_staff_password_conflict(uuid, text, uuid) to service_role;

notify pgrst, 'reload schema';
