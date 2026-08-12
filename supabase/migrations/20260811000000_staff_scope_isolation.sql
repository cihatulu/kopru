-- Personel (member) rolündeki kullanıcıların, `staff_scope` tablosunda kendilerine atanan
-- bayiler dışında hiçbir bayiyi, işlemi ve siparişi görmemesi için RLS politikalarının güncellenmesi.

-- ============================================================
-- 1. relationships RLS güncelleme
-- ============================================================

drop policy if exists "relationships_select_own_side" on public.relationships;

create policy "relationships_select_own_side"
  on public.relationships for select to authenticated
  using (
    (select public.is_platform_admin())
    or (
      (manufacturer_org_id = (select public.get_my_org_id())
       or retailer_org_id  = (select public.get_my_org_id()))
      -- Misafir izolasyonu (sponsor)
      and (
        (select public.get_my_sponsor_org_id()) is null
        or manufacturer_org_id = (select public.get_my_sponsor_org_id())
        or retailer_org_id     = (select public.get_my_sponsor_org_id())
      )
      -- Personel izolasyonu: Eğer kullanıcı 'member' ise ve org 'manufacturer' ise, 
      -- retailer_org_id kendisine (staff_scope'ta) atanmış olmalıdır.
      and (
        not ( (select public.get_my_org_role()) = 'staff' and (select public.get_my_org_kind()) = 'manufacturer' )
        or retailer_org_id in (select retailer_org_id from public.staff_scope where staff_user_id = (select public.get_my_user_id()))
      )
    )
  );


-- ============================================================
-- 2. orders RLS güncelleme
-- ============================================================

drop policy if exists "orders_select_own_side" on public.orders;

create policy "orders_select_own_side"
  on public.orders for select to authenticated
  using (
    (select public.is_platform_admin())
    or (
      (manufacturer_org_id = (select public.get_my_org_id())
       or retailer_org_id  = (select public.get_my_org_id()))
      -- Misafir izolasyonu (sponsor)
      and (
        (select public.get_my_sponsor_org_id()) is null
        or manufacturer_org_id = (select public.get_my_sponsor_org_id())
        or retailer_org_id     = (select public.get_my_sponsor_org_id())
      )
      -- Personel izolasyonu
      and (
        not ( (select public.get_my_org_role()) = 'staff' and (select public.get_my_org_kind()) = 'manufacturer' )
        or retailer_org_id in (select retailer_org_id from public.staff_scope where staff_user_id = (select public.get_my_user_id()))
      )
    )
  );


-- ============================================================
-- 3. transactions RLS güncelleme
-- ============================================================
-- relationships tablosundaki isolation nedeniyle transactions tablosuna 
-- dolaylı kısıtlama gerekir (relationship_id üzerinden). 
-- Mevcut policy'yi relationship'in "select" haklarına bağlamak en iyisidir.

create policy "transactions_select_own_side"
  on public.transactions for select to authenticated
  using (
    (select public.is_platform_admin())
    or (
      (manufacturer_org_id = (select public.get_my_org_id())
       or retailer_org_id  = (select public.get_my_org_id()))
      -- Misafir izolasyonu (sponsor)
      and (
        (select public.get_my_sponsor_org_id()) is null
        or manufacturer_org_id = (select public.get_my_sponsor_org_id())
        or retailer_org_id     = (select public.get_my_sponsor_org_id())
      )
      -- Personel izolasyonu
      and (
        not ( (select public.get_my_org_role()) = 'staff' and (select public.get_my_org_kind()) = 'manufacturer' )
        or retailer_org_id in (select retailer_org_id from public.staff_scope where staff_user_id = (select public.get_my_user_id()))
      )
    )
  );


-- ============================================================
-- 4. ledger_accounts_for_me() güncellemesi
-- ============================================================

create or replace function public.ledger_accounts_for_me()
returns setof public.ledger_account_row
language sql
security definer
stable
set search_path = public
as $$
  with me as (
    select public.get_my_org_id() as org_id,
           public.get_my_org_kind() as kind,
           public.get_my_org_role() as role,
           public.get_my_user_id() as user_id
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
       -- Personel izolasyonu:
       and (
         not ( m.role = 'staff' and m.kind = 'manufacturer' )
         or r.retailer_org_id in (select retailer_org_id from public.staff_scope where staff_user_id = m.user_id)
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
    left join last_row l on l.relationship_id = e.id;
$$;


-- ============================================================
-- 5. ssh_requests ve returns RLS güncellemeleri
-- ============================================================

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
      and (
        not ( (select public.get_my_org_role()) = 'staff' and (select public.get_my_org_kind()) = 'manufacturer' )
        or retailer_org_id in (select retailer_org_id from public.staff_scope where staff_user_id = (select public.get_my_user_id()))
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
      and (
        not ( (select public.get_my_org_role()) = 'staff' and (select public.get_my_org_kind()) = 'manufacturer' )
        or retailer_org_id in (select retailer_org_id from public.staff_scope where staff_user_id = (select public.get_my_user_id()))
      )
    )
  );

notify pgrst, 'reload schema';
