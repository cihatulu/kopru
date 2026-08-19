-- SSH Çoklu Ürün Desteği
--
-- Sorun: create_ssh_request tek product_id + quantity alıyordu.
--        Birden fazla ürün seçildiğinde sadece ilki kaydediliyordu.
--
-- Çözüm:
--   1. ssh_request_items tablosu: SSH talebi başına N ürün satırı
--   2. create_ssh_request RPC: p_items jsonb[] → ssh_request_items'e çoklu insert
--   3. Geriye dönük uyumluluk: mevcut ssh_requests.product_id korunur (eski kayıtlar için)

-- ── 1. Çoklu ürün tablosu ────────────────────────────────────────────────────

create table public.ssh_request_items (
  id             uuid primary key default gen_random_uuid(),
  ssh_request_id uuid not null references public.ssh_requests(id) on delete cascade,
  product_id     uuid references public.products(id) on delete set null,
  product_name   text not null,   -- snapshot: ürün adı talep anındaki değerle saklanır
  quantity       integer not null default 1 constraint ssh_request_items_qty_check check (quantity >= 1),
  created_at     timestamptz not null default now()
);

alter table public.ssh_request_items enable row level security;

create index ssh_request_items_ssh_idx on public.ssh_request_items (ssh_request_id);

-- RLS: SSH'ın tarafları görebilir (ilişki RLS mirror)
create policy "ssh_items_select"
on public.ssh_request_items for select to authenticated
using (
  exists (
    select 1 from public.ssh_requests s
     where s.id = ssh_request_items.ssh_request_id
       and (
         s.manufacturer_org_id = (select public.get_my_org_id())
         or s.retailer_org_id  = (select public.get_my_org_id())
         or (select public.is_platform_admin())
       )
  )
);
-- Yazma yalnız RPC'lerden.

-- ── 2. RPC güncelle ──────────────────────────────────────────────────────────
-- p_items: [{"product_id":"uuid","product_name":"text","quantity":N}, ...]
-- Geriye dönük: p_product_id / p_quantity hâlâ çalışır (tek ürün eski akış).

create or replace function public.create_ssh_request(
  p_relationship_id uuid,
  p_title           text,
  p_description     text    default null,
  p_order_id        uuid    default null,
  p_product_id      uuid    default null,
  p_customer        jsonb   default '{}'::jsonb,
  p_quantity        integer default 1,
  p_items           jsonb   default null   -- [{"product_id","product_name","quantity"}]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me          uuid := public.get_my_org_id();
  v_rel         public.relationships%rowtype;
  v_id          uuid;
  v_open_count  int;
  v_total_count int;
  v_item        jsonb;
  v_pname       text;
  v_pid         uuid;
  v_qty         int;
begin
  select * into v_rel from public.relationships
   where id = p_relationship_id and status = 'active';
  if not found then
    raise exception 'NO_ACTIVE_RELATIONSHIP' using errcode = '42501';
  end if;

  if v_me is not null
     and v_me not in (v_rel.manufacturer_org_id, v_rel.retailer_org_id)
     and not public.is_platform_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not public.relationship_has_module(p_relationship_id, 'ssh') then
    raise exception 'MODULE_NOT_ENABLED' using errcode = '42501';
  end if;

  -- Sipariş kısıtlamaları
  if p_order_id is not null then
    select count(*) into v_open_count
      from public.ssh_requests
     where order_id = p_order_id
       and status not in ('tamamlandi', 'iptal');
    if v_open_count > 0 then
      raise exception 'Bu sipariş için henüz sonuçlanmamış aktif bir SSH talebi bulunmaktadır.' using errcode = '22023';
    end if;

    select count(*) into v_total_count
      from public.ssh_requests
     where order_id = p_order_id;
    if v_total_count >= 2 then
      raise exception 'Bir sipariş için en fazla 2 kere SSH talebi açılabilir.' using errcode = '22023';
    end if;
  end if;

  -- Ana kayıt
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

  -- Çoklu ürün satırları
  if p_items is not null and jsonb_typeof(p_items) = 'array' and jsonb_array_length(p_items) > 0 then
    for v_item in select * from jsonb_array_elements(p_items)
    loop
      v_pname := coalesce(v_item->>'product_name', '');
      v_pid   := case when (v_item->>'product_id') ~ '^[0-9a-f-]{36}$'
                      then (v_item->>'product_id')::uuid else null end;
      v_qty   := greatest(1, coalesce((v_item->>'quantity')::int, 1));

      insert into public.ssh_request_items (ssh_request_id, product_id, product_name, quantity)
      values (v_id, v_pid, v_pname, v_qty);
    end loop;
  end if;

  return v_id;
end;
$$;

revoke all on public.ssh_request_items from anon;

notify pgrst, 'reload schema';
