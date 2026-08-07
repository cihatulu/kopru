-- KÖPRÜ — panel özeti
--
-- Her taraf KENDİ sayılarını görür. Fiyat izolasyonu (A4) burada da geçerli:
-- üretici özeti ciroyu KATMAN 2'den okur, perakendecinin satış fiyatına bakmaz.
--
-- Sayımlar tek sorguda ve indexli kolonlar üzerinden yapılır; ekran başına
-- yarım düzine ayrı COUNT sorgusu atmak yerine (A17).

drop function if exists public.dashboard_summary();

create or replace function public.dashboard_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.get_my_org_id();
  v_kind public.org_kind := public.get_my_org_kind();
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
      ),
      'pending_orders', (
        select count(*) from public.orders
         where manufacturer_org_id = v_me and status = 'pending'
      ),
      'pending_returns', (
        select count(*) from public.return_requests
         where manufacturer_org_id = v_me and status = 'pending'
      ),
      'pending_ssh', (
        select count(*) from public.ssh_requests
         where manufacturer_org_id = v_me and status in ('bekliyor', 'inceleniyor')
      ),
      -- Ciro KATMAN 2'den; perakendecinin satış fiyatı hesaba girmez (A5).
      'net_revenue', (
        select coalesce(sum(total_amount), 0) from public.orders
         where manufacturer_org_id = v_me
           and status not in ('cancelled', 'returned')
      ),
      'returned_amount', (
        select coalesce(sum(approved_amount), 0) from public.return_requests
         where manufacturer_org_id = v_me and status = 'approved'
      ),
      'approved_returns', (
        select count(*) from public.return_requests
         where manufacturer_org_id = v_me and status = 'approved'
      ),
      'completed_ssh', (
        select count(*) from public.ssh_requests
         where manufacturer_org_id = v_me and status = 'tamamlandi'
      )
    ) into v_result;
  else
    select jsonb_build_object(
      'supplier_count', (
        select count(*) from public.relationships
         where retailer_org_id = v_me and status = 'active'
      ),
      'open_orders', (
        select count(*) from public.orders
         where retailer_org_id = v_me
           and status not in ('delivered', 'cancelled', 'returned')
      ),
      'pending_returns', (
        select count(*) from public.return_requests
         where retailer_org_id = v_me and status = 'pending'
      ),
      'pending_ssh', (
        select count(*) from public.ssh_requests
         where retailer_org_id = v_me and status in ('bekliyor', 'inceleniyor')
      ),
      'purchase_total', (
        select coalesce(sum(total_amount), 0) from public.orders
         where retailer_org_id = v_me
           and status not in ('cancelled', 'returned')
      ),
      -- Toplam borç: her ilişkinin SON balance_after değeri (A18). SUM ile
      -- tüm hareketleri toplamak tam tarama demek olurdu.
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
      )
    ) into v_result;
  end if;

  return v_result;
end;
$$;

notify pgrst, 'reload schema';
