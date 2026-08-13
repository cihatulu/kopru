-- KÖPRÜ — Public sipariş takibi genişletildi
--
-- Müşteriye WhatsApp ile gönderilen `/takip/<jeton>` bağlantısının arkasındaki
-- veri. Jetonu bilen görür; kimlik doğrulaması YOKTUR.
--
-- FİYAT KATMANI (A4) — buradaki en kritik karar:
-- `order_items.supplier_unit_price` perakendecinin ÜRETİCİYE ödediği fiyattır
-- (KATMAN 2). Bu değeri takip sayfasında göstermek, perakendecinin kendi
-- müşterisine alış maliyetini ve dolayısıyla kâr marjını açık etmek olurdu.
-- Bu yüzden müşteriye YALNIZ `order_item_retail_prices.retail_unit_price`
-- (KATMAN 3) döner — müşterinin zaten kabul ettiği fiyat odur. Kayıtlı
-- perakende fiyatı yoksa satır fiyatsız (0) döner, üretici fiyatına DÜŞMEZ.
--
-- `orders.total_amount` de üretici tutarıdır; bu yüzden hiç dönmüyor.
-- Toplamı istemci kalemlerden hesaplar.
--
-- Yardımcılar ÖNCE tanımlanır: `language sql` gövdesi oluşturma anında
-- çözümlenir, sonra tanımlanan bir fonksiyona atıf yapılamaz.

-- Kalem listesi — fiyat KATMAN 3'ten gelir.
create or replace function public.track_order_items(p_order_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'productId', oi.product_id,
      'name', oi.product_snapshot->>'name',
      'quantity', oi.quantity,
      'unit_price', coalesce(rp.retail_unit_price, 0),
      'total_price', round(coalesce(rp.retail_unit_price, 0) * oi.quantity, 2)
    )
  ), '[]'::jsonb)
  from public.order_items oi
  left join public.order_item_retail_prices rp on rp.order_item_id = oi.id
  where oi.order_id = p_order_id;
$$;

-- Onaylanmış iade satırları. KÖPRÜ'de iade ayrı tabloda tutulur; eski projedeki
-- `orders.returned_items` jsonb kolonunun karşılığı budur.
create or replace function public.track_order_returns(p_order_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(item), '[]'::jsonb)
  from public.return_requests rr
  cross join lateral jsonb_array_elements(coalesce(rr.items, '[]'::jsonb)) as item
  where rr.order_id = p_order_id and rr.status = 'approved';
$$;

-- Durum geçmişi. NOT: iç yazışma sızmasın diye `note` DÖNMEZ.
create or replace function public.track_order_history(p_order_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object('status', l.to_status, 'created_at', l.created_at)
    order by l.created_at asc
  ), '[]'::jsonb)
  from public.order_status_logs l
  where l.order_id = p_order_id;
$$;

-- İmza aynı (uuid) ama dönüş tipi değişiyor; PostgreSQL bunun için DROP ister.
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
          'status', c.status,
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
grant execute on function public.track_order_items(uuid) to anon, authenticated;
grant execute on function public.track_order_returns(uuid) to anon, authenticated;
grant execute on function public.track_order_history(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
