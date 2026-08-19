-- KÖPRÜ — Public Sipariş Takibi Sevkiyat ve İptal Detayları
--
-- Çocuk siparişlerin (kısmi sevkiyat / iptaller) takip numarası (order_no) ve
-- not/açıklama (note) alanlarını da public takip verisine ekler.

drop function if exists public.track_order(uuid);

create or replace function public.track_order(p_token uuid)
returns table (
  order_no       text,
  status         public.order_status,
  customer_name  text,
  note           text,
  created_at     timestamptz,
  updated_at     timestamptz,
  items          jsonb,
  returned_items jsonb,
  history        jsonb,
  shipments      jsonb,
  payments       jsonb
)
language sql
security definer
stable
set search_path = public
as $$
  select
    r.order_no,
    r.status,
    r.customer_name,
    r.note,
    r.created_at,
    r.updated_at,
    public.track_order_items(r.id),
    public.track_order_returns(r.id),
    public.track_order_history(r.id),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'order_no', c.order_no,
          'status', c.status,
          'note', c.note,
          'created_at', c.created_at,
          'updated_at', c.updated_at,
          'items', public.track_order_items(c.id),
          'returned_items', public.track_order_returns(c.id),
          'history', public.track_order_history(c.id)
        )
        order by c.created_at asc
      )
      from public.orders c where c.parent_order_id = r.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'amount', f.amount,
          'method', f.method,
          'description', f.description,
          'created_at', f.created_at
        )
        order by f.created_at asc
      )
      from public.finance_entries f
      where f.kind = 'income'
        and (f.order_id = r.id
             or f.order_id in (select c.id from public.orders c where c.parent_order_id = r.id))
    ), '[]'::jsonb)
  from public.orders r
  where r.order_token = p_token;
$$;

grant execute on function public.track_order(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
