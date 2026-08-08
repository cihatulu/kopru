-- KÖPRÜ — ekip ve stok arayüzlerinin sunucu tarafı
--
-- Şema (staff_scope, set_staff_scope, bulk_update_stock) hazırdı ama ekipte
-- rol/durum değiştirmenin ve stoğu tek tek düzeltmenin yolu yoktu.

-- ============================================================ personel rolü

create or replace function public.set_staff_role(p_user_id uuid, p_role public.org_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_target public.users%rowtype;
begin
  if public.get_my_org_role() <> 'owner' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_target from public.users where id = p_user_id and org_id = v_me for update;
  if not found then
    raise exception 'STAFF_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Kendi rolünü düşürmek org'u sahipsiz bırakırdı: kimse personel ekleyemez,
  -- kimse rolü geri alamaz. Bu kapı kapalı kalmalı.
  if v_target.id = public.get_my_user_id() then
    raise exception 'CANNOT_CHANGE_OWN_ROLE' using errcode = '22023';
  end if;

  update public.users set org_role = p_role where id = p_user_id;
end;
$$;

grant execute on function public.set_staff_role(uuid, public.org_role) to authenticated;

-- ============================================================ personel durumu

create or replace function public.set_staff_active(p_user_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_target public.users%rowtype;
begin
  if public.get_my_org_role() <> 'owner' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_target from public.users where id = p_user_id and org_id = v_me for update;
  if not found then
    raise exception 'STAFF_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Kendini pasifleştirmek anında kilitlenme demektir.
  if v_target.id = public.get_my_user_id() then
    raise exception 'CANNOT_DEACTIVATE_SELF' using errcode = '22023';
  end if;

  -- Soft delete varsayılan (kilitli kural 16); auth kaydı silinmez.
  update public.users set is_active = p_is_active where id = p_user_id;

  -- Pasifleşen personelin kapsamı da düşer: geri açıldığında eski müşterilere
  -- sessizce erişmesin, sahibi yeniden karar versin.
  if not p_is_active then
    delete from public.staff_scope where staff_user_id = p_user_id;
  end if;
end;
$$;

grant execute on function public.set_staff_active(uuid, boolean) to authenticated;

-- ============================================================ tekil stok

create or replace function public.set_product_stock(p_product_id uuid, p_quantity numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
begin
  if public.get_my_org_kind() <> 'manufacturer' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if public.get_my_org_role() not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity < 0 then
    raise exception 'INVALID_QUANTITY' using errcode = '22023';
  end if;

  -- Yalnız kendi ürünü. İstemci `manufacturer_stock`'a asla doğrudan yazmaz
  -- (kilitli kural 14); sipariş dışı düzeltmenin meşru yolu burasıdır.
  if not exists (
    select 1 from public.products p where p.id = p_product_id and p.owner_org_id = v_me
  ) then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.manufacturer_stock (owner_org_id, product_id, quantity)
  values (v_me, p_product_id, p_quantity)
  on conflict (owner_org_id, product_id)
    do update set quantity = excluded.quantity, updated_at = now();
end;
$$;

grant execute on function public.set_product_stock(uuid, numeric) to authenticated;

notify pgrst, 'reload schema';
