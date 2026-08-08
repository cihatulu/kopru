-- KÖPRÜ — ürün gruplarına toplu atama
--
-- `save_product` bir ürünün grubunu tek tek değiştirebiliyordu ama "seçtiğim
-- 8 ürünü bu gruba koy" ya da "grubun içeriğini şu liste yap" işlemleri için
-- tek tek çağrı yapmak gerekiyordu: 8 istek, 8 ayrı transaction, yarısı
-- başarılı olabilen bir sonuç. Toplu işlemler tek transaction olmalı.

-- ============================================================ toplu atama

create or replace function public.assign_products_to_group(
  p_product_ids uuid[],
  p_group_id uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_count int;
begin
  if public.get_my_org_kind() <> 'manufacturer' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if public.get_my_org_role() not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Grup verilmişse BENİM grubum olmak zorunda; başkasının grubuna ürün
  -- taşımak, o grubun sahibine ait olmayan ürünleri göstermek olurdu.
  if p_group_id is not null and not exists (
    select 1 from public.product_groups g
     where g.id = p_group_id and g.owner_org_id = v_me
  ) then
    raise exception 'GROUP_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Yalnız kendi ürünlerim. Listeye yabancı bir id yazmak işe yaramaz;
  -- sessizce atlanır ve dönen sayıya girmez.
  update public.products
     set group_id = p_group_id
   where id = any(p_product_ids)
     and owner_org_id = v_me;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.assign_products_to_group(uuid[], uuid) to authenticated;

-- ============================================================ grup içeriği

/**
 * Grubun içeriğini VERİLEN LİSTEYE eşitler.
 *
 * "Grubu düzenle" ekranının kaydetme işlemi: listede olmayanlar gruptan
 * çıkar, olanlar girer. İki ayrı çağrı (önce çıkar, sonra ekle) yapılsaydı
 * arada bir hata olduğunda grup yarı boş kalırdı.
 */
create or replace function public.set_group_products(
  p_group_id uuid,
  p_product_ids uuid[]
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_count int;
begin
  if public.get_my_org_kind() <> 'manufacturer' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if public.get_my_org_role() not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.product_groups g
     where g.id = p_group_id and g.owner_org_id = v_me
  ) then
    raise exception 'GROUP_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Gruptan çıkanlar: ürün SİLİNMEZ, yalnız gruptan düşer (grup bir etikettir).
  update public.products
     set group_id = null
   where owner_org_id = v_me
     and group_id = p_group_id
     and not (id = any(coalesce(p_product_ids, '{}'::uuid[])));

  update public.products
     set group_id = p_group_id
   where owner_org_id = v_me
     and id = any(coalesce(p_product_ids, '{}'::uuid[]));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.set_group_products(uuid, uuid[]) to authenticated;

notify pgrst, 'reload schema';
