-- ============================================================
-- SSH Talebi — Talep Edilen Miktar
-- ============================================================
--
-- Perakendeci SSH talep formunda kaç adet için şikayet ettiğini
-- seçebilir. Bu seçim daha önce kaydedilmiyordu; DB'ye yazılıyordu
-- ama RPC parametresi ve kolon yoktu, bu yüzden her zaman sipariş
-- kalemine ait toplam adet gösteriliyordu.
--
-- Değişiklikler:
--   1. ssh_requests.quantity kolonu (talep edilen adet; default 1)
--   2. create_ssh_request RPC'ye p_quantity parametresi eklendi

-- 1. Kolon
alter table public.ssh_requests
  add column if not exists quantity integer not null default 1
  constraint ssh_requests_quantity_check check (quantity >= 1);

-- 2. RPC güncelle (son versiyon; 20260812090000 üzerine yazar)
create or replace function public.create_ssh_request(
  p_relationship_id uuid,
  p_title           text,
  p_description     text    default null,
  p_order_id        uuid    default null,
  p_product_id      uuid    default null,
  p_customer        jsonb   default '{}'::jsonb,
  p_quantity        integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_rel public.relationships%rowtype;
  v_id uuid;
  v_open_count int;
  v_total_count int;
begin
  select * into v_rel from public.relationships
   where id = p_relationship_id and status = 'active';
  if not found then
    raise exception 'NO_ACTIVE_RELATIONSHIP' using errcode = '42501';
  end if;

  if v_me is not null and v_me not in (v_rel.manufacturer_org_id, v_rel.retailer_org_id) and not public.is_platform_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not public.relationship_has_module(p_relationship_id, 'ssh') then
    raise exception 'MODULE_NOT_ENABLED' using errcode = '42501';
  end if;

  -- Sipariş kısıtlamaları
  if p_order_id is not null then
    -- Kural 1: Aktif (sonuçlanmayan) talep kontrolü
    select count(*) into v_open_count
      from public.ssh_requests
     where order_id = p_order_id
       and status not in ('tamamlandi', 'iptal');

    if v_open_count > 0 then
      raise exception 'Bu sipariş için henüz sonuçlanmamış aktif bir SSH talebi bulunmaktadır.' using errcode = '22023';
    end if;

    -- Kural 2: Max 2 talep kontrolü
    select count(*) into v_total_count
      from public.ssh_requests
     where order_id = p_order_id;

    if v_total_count >= 2 then
      raise exception 'Bir sipariş için en fazla 2 kere SSH talebi açılabilir.' using errcode = '22023';
    end if;
  end if;

  insert into public.ssh_requests (
    relationship_id, manufacturer_org_id, retailer_org_id, order_id, product_id,
    title, description, customer_name, customer_phone, quantity
  ) values (
    p_relationship_id, v_rel.manufacturer_org_id, v_rel.retailer_org_id, p_order_id, p_product_id,
    btrim(p_title), p_description,
    nullif(p_customer->>'name', ''), nullif(p_customer->>'phone', ''),
    greatest(1, coalesce(p_quantity, 1))
  )
  returning id into v_id;

  return v_id;
end;
$$;
