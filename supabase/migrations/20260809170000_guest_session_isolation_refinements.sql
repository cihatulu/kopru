-- Misafir oturum izolasyonu iyileştirmeleri (Faz 2)
--
-- Bu migration, misafir oturumların (guest session) sponsor bazında izole edilmesini
-- tüm tablo ve fonksiyonlara (katalog, stok, duyurular, iadeler, SSH ve paneller) yayar.
-- get_my_sponsor_org_id() claim'i set edilmişse, kullanıcı yalnız o sponsorun verilerine erişebilir.

-- ============================================================ 1. ledger_accounts_for_me() güncelleme

create or replace function public.ledger_accounts_for_me()
returns setof public.ledger_account_row
language sql
security definer
stable
set search_path = public
as $$
  with me as (
    select public.get_my_org_id() as org_id,
           public.get_my_org_kind() as kind
  ),
  edges as (
    select r.id,
           case when m.kind = 'manufacturer'
                then r.retailer_org_id
                else r.manufacturer_org_id end as counterparty_org_id
      from public.relationships r, me m
     where r.status = 'active'
       and (r.manufacturer_org_id = m.org_id or r.retailer_org_id = m.org_id)
       -- Sponsor izolasyonu:
       and (
         public.get_my_sponsor_org_id() is null
         or r.manufacturer_org_id = public.get_my_sponsor_org_id()
         or r.retailer_org_id     = public.get_my_sponsor_org_id()
       )
  ),
  sums as (
    select t.relationship_id,
           coalesce(sum(case when t.type = 'debit'  then t.amount else 0 end), 0) as total_debit,
           coalesce(sum(case when t.type = 'credit' then t.amount else 0 end), 0) as total_credit
      from public.transactions t
     where t.relationship_id in (select id from edges)
     group by t.relationship_id
  ),
  last_row as (
    select distinct on (t.relationship_id)
           t.relationship_id, t.balance_after
      from public.transactions t
     where t.relationship_id in (select id from edges)
     order by t.relationship_id, t.created_at desc, t.id desc
  )
  select e.id,
         e.counterparty_org_id,
         o.company_name,
         o.vkn_tc,
         coalesce(s.total_debit,  0),
         coalesce(s.total_credit, 0),
         coalesce(l.balance_after, 0),
         o.is_subscriber
    from edges e
    join public.organizations o on o.id = e.counterparty_org_id
    left join sums     s on s.relationship_id = e.id
    left join last_row l on l.relationship_id = e.id
   order by o.company_name;
$$;

-- ============================================================ 2. manual_transaction_requests RLS güncelleme

drop policy if exists "mtr_select" on public.manual_transaction_requests;

create policy "mtr_select"
  on public.manual_transaction_requests for select to authenticated
  using (
    exists (
      select 1 from public.relationships r
       where r.id = relationship_id
         and (r.manufacturer_org_id = public.get_my_org_id()
              or r.retailer_org_id  = public.get_my_org_id())
         -- Sponsor izolasyonu:
         and (
           public.get_my_sponsor_org_id() is null
           or r.manufacturer_org_id = public.get_my_sponsor_org_id()
           or r.retailer_org_id     = public.get_my_sponsor_org_id()
         )
    )
  );

-- ============================================================ 3. Katalog (product_groups ve products) RLS güncellemeleri

drop policy if exists "product_groups_select_owner_or_customer" on public.product_groups;

create policy "product_groups_select_owner_or_customer"
on public.product_groups for select to authenticated
using (
  owner_org_id = (select public.get_my_org_id())
  or exists (
    select 1 from public.relationships r
     where r.manufacturer_org_id = product_groups.owner_org_id
       and r.retailer_org_id = (select public.get_my_org_id())
       and r.status = 'active'
       -- Sponsor izolasyonu:
       and (
         public.get_my_sponsor_org_id() is null
         or r.manufacturer_org_id = public.get_my_sponsor_org_id()
       )
  )
  or (select public.is_platform_admin())
);

drop policy if exists "products_select_owner_or_customer" on public.products;

create policy "products_select_owner_or_customer"
on public.products for select to authenticated
using (
  owner_org_id = (select public.get_my_org_id())
  or exists (
    select 1 from public.relationships r
     where r.manufacturer_org_id = products.owner_org_id
       and r.retailer_org_id = (select public.get_my_org_id())
       and r.status = 'active'
       -- Sponsor izolasyonu:
       and (
         public.get_my_sponsor_org_id() is null
         or r.manufacturer_org_id = public.get_my_sponsor_org_id()
       )
  )
  or (select public.is_platform_admin())
);

-- ============================================================ 4. Stok RLS güncellemesi

drop policy if exists "manufacturer_stock_select_active_dealer" on public.manufacturer_stock;

create policy "manufacturer_stock_select_active_dealer"
on public.manufacturer_stock for select to authenticated
using (
  exists (
    select 1
      from public.relationships r
     where r.manufacturer_org_id = manufacturer_stock.owner_org_id
       and r.retailer_org_id = (select public.get_my_org_id())
       and r.status = 'active'
       -- Sponsor izolasyonu:
       and (
         public.get_my_sponsor_org_id() is null
         or r.manufacturer_org_id = public.get_my_sponsor_org_id()
       )
  )
);

-- ============================================================ 5. Duyurular RLS güncellemesi

drop policy if exists "announcements_customer_select" on public.announcements;

create policy "announcements_customer_select"
on public.announcements for select to authenticated
using (
  is_active
  and (
    target_retailer_org_id is null
    or target_retailer_org_id = (select public.get_my_org_id())
  )
  and exists (
    select 1 from public.relationships r
     where r.manufacturer_org_id = announcements.owner_org_id
       and r.retailer_org_id = (select public.get_my_org_id())
       and r.status = 'active'
       -- Sponsor izolasyonu:
       and (
         public.get_my_sponsor_org_id() is null
         or r.manufacturer_org_id = public.get_my_sponsor_org_id()
       )
  )
);

-- ============================================================ 6. SSH & İade RLS güncellemeleri

drop policy if exists "ssh_select_own_side" on public.ssh_requests;

create policy "ssh_select_own_side"
on public.ssh_requests for select to authenticated
using (
  (select public.is_platform_admin())
  or (
    (manufacturer_org_id = (select public.get_my_org_id())
     or retailer_org_id  = (select public.get_my_org_id()))
    and (
      (select public.get_my_sponsor_org_id()) is null
      or manufacturer_org_id = (select public.get_my_sponsor_org_id())
      or retailer_org_id     = (select public.get_my_sponsor_org_id())
    )
  )
);

drop policy if exists "returns_select_own_side" on public.return_requests;

create policy "returns_select_own_side"
on public.return_requests for select to authenticated
using (
  (select public.is_platform_admin())
  or (
    (manufacturer_org_id = (select public.get_my_org_id())
     or retailer_org_id  = (select public.get_my_org_id()))
    and (
      (select public.get_my_sponsor_org_id()) is null
      or manufacturer_org_id = (select public.get_my_sponsor_org_id())
      or retailer_org_id     = (select public.get_my_sponsor_org_id())
    )
  )
);

-- ============================================================ 7. Sipariş kalemleri & durum logları RLS

drop policy if exists "order_items_select_via_order" on public.order_items;

create policy "order_items_select_via_order"
on public.order_items for select to authenticated
using (
  exists (
    select 1 from public.orders o
     where o.id = order_items.order_id
       and (o.manufacturer_org_id = (select public.get_my_org_id())
         or o.retailer_org_id     = (select public.get_my_org_id()))
       -- Sponsor izolasyonu:
       and (
         public.get_my_sponsor_org_id() is null
         or o.manufacturer_org_id = public.get_my_sponsor_org_id()
         or o.retailer_org_id     = public.get_my_sponsor_org_id()
       )
  )
);

drop policy if exists "order_status_logs_select_via_order" on public.order_status_logs;

create policy "order_status_logs_select_via_order"
on public.order_status_logs for select to authenticated
using (
  exists (
    select 1 from public.orders o
     where o.id = order_status_logs.order_id
       and (o.manufacturer_org_id = (select public.get_my_org_id())
         or o.retailer_org_id     = (select public.get_my_org_id()))
       -- Sponsor izolasyonu:
       and (
         public.get_my_sponsor_org_id() is null
         or o.manufacturer_org_id = public.get_my_sponsor_org_id()
         or o.retailer_org_id     = public.get_my_sponsor_org_id()
       )
  )
);

-- ============================================================ 8. dashboard_summary() güncelleme

create or replace function public.dashboard_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_kind public.org_kind := public.get_my_org_kind();
  v_sponsor uuid := public.get_my_sponsor_org_id();
  v_result jsonb;
begin
  if v_me is null then
    raise exception 'NO_ORG' using errcode = '42501';
  end if;

  if v_kind = 'manufacturer' then
    select jsonb_build_object(
      'product_count', (
        select count(*) from public.products
         where owner_org_id = v_me and is_active
      ),
      'partner_count', (
        select count(*) from public.relationships
         where manufacturer_org_id = v_me and status = 'active'
           and (v_sponsor is null or retailer_org_id = v_sponsor)
      ),
      'pending_orders', (
        select count(*) from public.orders
         where manufacturer_org_id = v_me and status = 'pending'
           and (v_sponsor is null or retailer_org_id = v_sponsor)
      ),
      'pending_returns', (
        select count(*) from public.return_requests
         where manufacturer_org_id = v_me and status = 'pending'
           and (v_sponsor is null or retailer_org_id = v_sponsor)
      ),
      'pending_ssh', (
        select count(*) from public.ssh_requests
         where manufacturer_org_id = v_me and status in ('bekliyor', 'inceleniyor')
           and (v_sponsor is null or retailer_org_id = v_sponsor)
      ),
      -- Ciro KATMAN 2'den; perakendecinin satış fiyatı hesaba girmez (A5).
      'net_revenue', (
        select coalesce(sum(total_amount), 0) from public.orders
         where manufacturer_org_id = v_me
           and status not in ('cancelled', 'returned')
           and (v_sponsor is null or retailer_org_id = v_sponsor)
      ),
      'returned_amount', (
        select coalesce(sum(approved_amount), 0) from public.return_requests
         where manufacturer_org_id = v_me and status = 'approved'
           and (v_sponsor is null or retailer_org_id = v_sponsor)
      ),
      'approved_returns', (
        select count(*) from public.return_requests
         where manufacturer_org_id = v_me and status = 'approved'
           and (v_sponsor is null or retailer_org_id = v_sponsor)
      ),
      'completed_ssh', (
        select count(*) from public.ssh_requests
         where manufacturer_org_id = v_me and status = 'tamamlandi'
           and (v_sponsor is null or retailer_org_id = v_sponsor)
      )
    ) into v_result;
  else
    select jsonb_build_object(
      'supplier_count', (
        select count(*) from public.relationships
         where retailer_org_id = v_me and status = 'active'
           and (v_sponsor is null or manufacturer_org_id = v_sponsor)
      ),
      'open_orders', (
        select count(*) from public.orders
         where retailer_org_id = v_me
           and status not in ('delivered', 'cancelled', 'returned')
           and (v_sponsor is null or manufacturer_org_id = v_sponsor)
      ),
      'pending_returns', (
        select count(*) from public.return_requests
         where retailer_org_id = v_me and status = 'pending'
           and (v_sponsor is null or manufacturer_org_id = v_sponsor)
      ),
      'pending_ssh', (
        select count(*) from public.ssh_requests
         where retailer_org_id = v_me and status in ('bekliyor', 'inceleniyor')
           and (v_sponsor is null or manufacturer_org_id = v_sponsor)
      ),
      'purchase_total', (
        select coalesce(sum(total_amount), 0) from public.orders
         where retailer_org_id = v_me
           and status not in ('cancelled', 'returned')
           and (v_sponsor is null or manufacturer_org_id = v_sponsor)
      ),
      -- Toplam borç: her ilişkinin SON balance_after değeri (A18).
      'total_debt', (
        select coalesce(sum(b.balance_after), 0)
          from public.relationships r
          cross join lateral (
            select t.balance_after
              from public.transactions t
             where t.relationship_id = r.id
             order by t.created_at desc, t.id desc
             limit 1
          ) b
         where r.retailer_org_id = v_me
           and (v_sponsor is null or r.manufacturer_org_id = v_sponsor)
      )
    ) into v_result;
  end if;

  return v_result;
end;
$$;

notify pgrst, 'reload schema';
