-- DATA-FIX: 260817 tarihli kök siparişleri global sıraya göre yeniden numaralandır.
--
-- Sorun: Migration öncesi üretici bazlı sayaçtan gelen siparişler aynı gün
--        farklı üreticilerde çakışıyordu.
--
-- Bugün (260817) için düzeltme:
--   hakan mobilya  → 260817-0001  (16:13 UTC) — değişmez
--   gokhan mobilya → 260817-0001  (17:14 UTC) → 260817-0002
--   cihat mobilya  → 260817-0001  (20:54 UTC) → 260817-0003
--   cihat mobilya  → 260817-0002  (20:55 UTC) → 260817-0004
--
-- NOT: Eski tarihlerdeki veriler değiştirilmez. Global unique kısıt
--      eski çakışmalar nedeniyle eklenemiyor; next_order_no fonksiyonunun
--      global sayacı ileriye dönük benzersizliği garantiler.

do $$
declare
  v_root_id  uuid;
  v_child_id uuid;
  v_new_root text;
  v_old_root text;
  v_suffix   text;
begin

  -- ── gokhan mobilya kök: 260817-0001 → 260817-0002 ─────────────────────────
  v_root_id  := '46446939-d26a-4b2e-89e3-023683f02202'::uuid;
  v_old_root := '260817-0001';
  v_new_root := '260817-0002';

  update public.orders set order_no = v_new_root where id = v_root_id;

  for v_child_id, v_suffix in
    select id, substring(order_no from length(v_old_root) + 2)
    from public.orders
    where parent_order_id = v_root_id
  loop
    update public.orders
       set order_no = v_new_root || '/' || v_suffix
     where id = v_child_id;
  end loop;

  -- ── cihat mobilya kök 1: 260817-0001 → 260817-0003 ───────────────────────
  v_root_id  := 'd71717cb-afc8-4376-8315-a2b70f37cf05'::uuid;
  v_old_root := '260817-0001';
  v_new_root := '260817-0003';

  update public.orders set order_no = v_new_root where id = v_root_id;

  for v_child_id, v_suffix in
    select id, substring(order_no from length(v_old_root) + 2)
    from public.orders
    where parent_order_id = v_root_id
  loop
    update public.orders
       set order_no = v_new_root || '/' || v_suffix
     where id = v_child_id;
  end loop;

  -- ── cihat mobilya kök 2: 260817-0002 → 260817-0004 ───────────────────────
  v_root_id  := '2b0c34cd-3c0b-47c4-8546-c04fecd419b3'::uuid;
  v_old_root := '260817-0002';
  v_new_root := '260817-0004';

  update public.orders set order_no = v_new_root where id = v_root_id;

  for v_child_id, v_suffix in
    select id, substring(order_no from length(v_old_root) + 2)
    from public.orders
    where parent_order_id = v_root_id
  loop
    update public.orders
       set order_no = v_new_root || '/' || v_suffix
     where id = v_child_id;
  end loop;

  -- ── Global sayacı 4'e güncelle ────────────────────────────────────────────
  insert into public.order_sequences (manufacturer_org_id, day, last_no)
  values ('00000000-0000-0000-0000-000000000000', '2026-08-17', 4)
  on conflict (manufacturer_org_id, day)
    do update set last_no = 4;

  raise notice 'DATA-FIX tamamlandı.';
end;
$$;

notify pgrst, 'reload schema';
