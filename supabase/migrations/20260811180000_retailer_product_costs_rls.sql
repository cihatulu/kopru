-- KÖPRÜ — RLS Policy for product_costs: Allow retailer to view/edit misafir manufacturer costs

drop policy if exists "product_costs_owner_only" on public.product_costs;

create policy "product_costs_owner_or_retailer_editor"
on public.product_costs for all to authenticated
using (
  owner_org_id = public.get_my_org_id()
  or (select public.is_platform_admin())
  or exists (
    select 1 from public.relationships r
    join public.organizations org on org.id = r.manufacturer_org_id
    where r.manufacturer_org_id = public.product_costs.owner_org_id
      and r.retailer_org_id = public.get_my_org_id()
      and r.status = 'active'
      and r.can_edit_catalog = true
      and org.is_subscriber = false
  )
)
with check (
  owner_org_id = public.get_my_org_id()
  or (select public.is_platform_admin())
  or exists (
    select 1 from public.relationships r
    join public.organizations org on org.id = r.manufacturer_org_id
    where r.manufacturer_org_id = public.product_costs.owner_org_id
      and r.retailer_org_id = public.get_my_org_id()
      and r.status = 'active'
      and r.can_edit_catalog = true
      and org.is_subscriber = false
  )
);

notify pgrst, 'reload schema';
