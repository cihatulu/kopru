-- KÖPRÜ — ekip yönetimi ve stok
--
-- PERSONEL KAPSAMI: furniture-platform'da personel, üreticinin YALNIZ seçilen
-- bayilerinin işlemlerini görebiliyordu. Aynı davranış korunuyor ama RLS ile
-- zorlanıyor: atama yoksa personel HİÇBİR müşteriyi görmez.
--
-- Kapsam boşsa "hepsini gör" DEĞİL "hiçbirini gör" seçildi: yeni açılan bir
-- personelin kazara tüm müşterilere erişmesi, hiç erişememesinden çok daha
-- kötü bir hatadır.

create table public.staff_scope (
  staff_user_id uuid not null references public.users(id) on delete cascade,
  retailer_org_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (staff_user_id, retailer_org_id)
);

alter table public.staff_scope enable row level security;
create index staff_scope_retailer_idx on public.staff_scope (retailer_org_id);

-- Org sahibi kendi personelinin kapsamını yönetir; personel kendi kapsamını görür.
create policy "staff_scope_owner_manage"
on public.staff_scope for all to authenticated
using (
  exists (
    select 1 from public.users u
     where u.id = staff_scope.staff_user_id
       and u.org_id = (select public.get_my_org_id())
       and (select public.get_my_org_role()) = 'owner'
  )
)
with check (
  exists (
    select 1 from public.users u
     where u.id = staff_scope.staff_user_id
       and u.org_id = (select public.get_my_org_id())
       and (select public.get_my_org_role()) = 'owner'
  )
);

create policy "staff_scope_self_read"
on public.staff_scope for select to authenticated
using (staff_user_id = (select public.get_my_user_id()));

revoke all on public.staff_scope from anon;

-- ============================================================ personel oluşturma
-- Şifre BURADA yazılmaz (kilitli kural 2); bu RPC yalnız users satırını ve
-- kapsamı kurar. Auth kaydı `admin-provision-owner` deseninde ayrı bir Edge
-- Function tarafından açılır.

drop function if exists public.set_staff_scope(uuid, uuid[]);

create or replace function public.set_staff_scope(
  p_staff_user_id uuid,
  p_retailer_org_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
begin
  if public.get_my_org_role() <> 'owner' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.users u where u.id = p_staff_user_id and u.org_id = v_me
  ) then
    raise exception 'STAFF_NOT_FOUND' using errcode = 'P0002';
  end if;

  delete from public.staff_scope where staff_user_id = p_staff_user_id;

  -- Yalnız GERÇEKTEN ilişkimiz olan perakendeciler atanabilir; aksi halde
  -- personele, org'un kendisinin bile göremediği bir müşteri verilebilirdi.
  insert into public.staff_scope (staff_user_id, retailer_org_id)
  select r.retailer_org_id
    from public.relationships r
   where r.manufacturer_org_id = v_me
     and r.retailer_org_id = any(p_retailer_org_ids)
  on conflict do nothing;
end;
$$;

-- ============================================================ toplu stok güncelleme
-- CSV ile gelen satırlar tek transaction'da işlenir; yarım güncelleme olmaz.

drop function if exists public.bulk_update_stock(jsonb);

create or replace function public.bulk_update_stock(p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_row jsonb;
  v_product_id uuid;
  v_qty numeric(14,3);
  v_count int := 0;
begin
  if public.get_my_org_kind() <> 'manufacturer' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if public.get_my_org_role() not in ('owner', 'staff') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'INVALID_PAYLOAD' using errcode = '22023';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_product_id := (v_row->>'product_id')::uuid;
    v_qty := (v_row->>'quantity')::numeric;
    if v_product_id is null or v_qty is null or v_qty < 0 then
      continue;
    end if;

    -- Yalnız KENDİ ürünü güncellenebilir; CSV'ye yabancı bir id yazmak
    -- başkasının stoğuna dokunmaya yetmez.
    if not exists (
      select 1 from public.products p
       where p.id = v_product_id and p.owner_org_id = v_me
    ) then
      continue;
    end if;

    insert into public.manufacturer_stock (owner_org_id, product_id, quantity)
    values (v_me, v_product_id, v_qty)
    on conflict (owner_org_id, product_id)
      do update set quantity = excluded.quantity, updated_at = now();

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

notify pgrst, 'reload schema';
