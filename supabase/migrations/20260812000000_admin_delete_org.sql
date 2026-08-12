-- KÖPRÜ — Admin Delete Organization Atomic

create or replace function public.admin_delete_org(
  p_org_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- 1. SSH talepleri
  delete from public.ssh_requests
  where target_org_id = p_org_id
     or relationship_id in (
       select id from public.relationships
       where manufacturer_org_id = p_org_id or retailer_org_id = p_org_id
     );

  -- 2. Sipariş detay fiyatları & kalemleri & siparişler
  delete from public.order_item_retail_prices
  where order_item_id in (
    select oi.id from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.manufacturer_org_id = p_org_id or o.retailer_org_id = p_org_id
  );

  delete from public.order_items
  where order_id in (
    select id from public.orders
    where manufacturer_org_id = p_org_id or retailer_org_id = p_org_id
  );

  delete from public.orders
  where manufacturer_org_id = p_org_id or retailer_org_id = p_org_id;

  -- 3. Cari işlemler
  delete from public.transactions
  where manufacturer_org_id = p_org_id
     or retailer_org_id = p_org_id
     or org_id = p_org_id;

  -- 4. Ticari ilişkiler
  delete from public.relationships
  where manufacturer_org_id = p_org_id
     or retailer_org_id = p_org_id
     or initiated_by_org_id = p_org_id;

  -- 5. İadeler & SSH biletleri
  delete from public.returns
  where manufacturer_org_id = p_org_id or retailer_org_id = p_org_id;

  delete from public.service_tickets
  where manufacturer_org_id = p_org_id or retailer_org_id = p_org_id;

  -- 6. Stok hareketleri, maliyetler & perakende satış fiyatları
  delete from public.stock_adjustments where org_id = p_org_id;
  delete from public.product_costs where owner_org_id = p_org_id;
  delete from public.retail_prices where retailer_org_id = p_org_id;

  -- 7. Ürünler & gruplar
  delete from public.products where owner_org_id = p_org_id;
  delete from public.product_groups where owner_org_id = p_org_id;

  -- 8. Duyurular, davetler, adaylar
  delete from public.announcements
  where publisher_org_id = p_org_id or target_retailer_org_id = p_org_id;

  delete from public.invitations
  where issuer_org_id = p_org_id or invited_org_id = p_org_id;

  delete from public.leads where sponsor_org_id = p_org_id;

  -- 9. Firma kullanıcıları
  delete from public.users where org_id = p_org_id;

  -- 10. Self-FK bağlarını çöz ve firmayı sil
  update public.organizations set created_by_org_id = null where created_by_org_id = p_org_id;
  delete from public.organizations where id = p_org_id;
end;
$$;

grant execute on function public.admin_delete_org(uuid) to authenticated;
