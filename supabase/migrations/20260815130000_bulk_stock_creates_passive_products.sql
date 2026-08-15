-- KÖPRÜ — Excel ile stok yüklerken tanınmayan satırdan PASİF ürün doğar
--
-- ÖNCE: `bulk_update_stock` ürün kimliği olmayan satırı sessizce atlıyordu.
-- Depoda olup katalogda olmayan ürünü sisteme sokmanın tek yolu tek tek ürün
-- eklemekti; elli kalemlik bir sayımda bu pratikte yapılmıyordu.
--
-- ŞİMDİ: ürün kimliği BOŞ ama adı dolu olan satır için ürün oluşturulur.
--
--   is_active     = false  → PASİF doğar
--   supplier_price = 0     → fiyatı üretici sonra girer
--
-- NEDEN PASİF: `supplier_price` KATMAN 2'dir — carinin tek bazı, iki tarafın
-- da gördüğü rakam. Sıfır fiyatlı bir ürünün sipariş edilebilmesi cariyi
-- bozardı. Pasiflik bu yüzden güvenlik kilidi: katalog sorguları `activeOnly`
-- ile süzer ve `place_order_atomic` zaten `is_active` şartı koşar, yani bayat
-- bir sepetten bile sipariş verilemez.
--
-- DOLU AMA YABANCI KİMLİK OLUŞTURMAZ: kimliği dolu olup bize ait olmayan satır
-- ESKİSİ GİBİ ATLANIR. Başkasının ürün kimliğiyle kendi kataloğumuzda ürün
-- doğurmak, o kimliğin varlığını doğrulamaya da yarardı.
--
-- DÖNÜŞ TİPİ DEĞİŞTİ (int → jsonb): kullanıcıya "kaç güncellendi" ile "kaç
-- yeni ürün açıldı" ayrı gösterilir. İmza değiştiği için DROP → CREATE →
-- NOTIFY (kilitli kural 6).

drop function if exists public.bulk_update_stock(jsonb);

create or replace function public.bulk_update_stock(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_row jsonb;
  v_product_id uuid;
  v_qty numeric(14,3);
  v_name text;
  v_code text;
  v_category text;
  v_updated int := 0;
  v_created int := 0;
begin
  if public.get_my_org_kind() <> 'manufacturer' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if public.get_my_org_role() not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if not public.manufacturer_may_write_stock() then
    raise exception 'STOCK_NOT_ALLOWED' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'INVALID_PAYLOAD' using errcode = '22023';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_product_id := nullif(v_row->>'product_id', '')::uuid;
    v_qty := nullif(v_row->>'quantity', '')::numeric;
    v_name := nullif(btrim(coalesce(v_row->>'name', '')), '');
    v_code := btrim(coalesce(v_row->>'code', ''));
    v_category := nullif(btrim(coalesce(v_row->>'category', '')), '');

    if v_qty is null or v_qty < 0 then
      continue;
    end if;

    if v_product_id is null then
      -- Yeni ürün: adı olmayan satırdan ürün doğmaz.
      if v_name is null then
        continue;
      end if;

      insert into public.products
        (owner_org_id, owner_kind, name, code, category, supplier_price, is_active)
      values
        (v_me, 'manufacturer', v_name, v_code, v_category, 0, false)
      returning id into v_product_id;

      v_created := v_created + 1;
    else
      -- Yalnız KENDİ ürünü güncellenebilir; CSV'ye yabancı bir id yazmak
      -- başkasının stoğuna dokunmaya yetmez ve ürün DOĞURMAZ.
      if not exists (
        select 1 from public.products p
         where p.id = v_product_id and p.owner_org_id = v_me
      ) then
        continue;
      end if;

      v_updated := v_updated + 1;
    end if;

    insert into public.manufacturer_stock (owner_org_id, product_id, quantity)
    values (v_me, v_product_id, v_qty)
    on conflict (owner_org_id, product_id)
      do update set quantity = excluded.quantity, updated_at = now();
  end loop;

  return jsonb_build_object('updated', v_updated, 'created', v_created);
end;
$$;

grant execute on function public.bulk_update_stock(jsonb) to authenticated;

notify pgrst, 'reload schema';
