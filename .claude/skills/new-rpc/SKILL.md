---
name: new-rpc
description: Atomik RPC oluştur veya değiştir — tek imza, DROP→CREATE→NOTIFY disiplini, ledger değişmezliği, balance_after running balance. RPC eklerken/değiştirirken kullan (kilitli kural 6 + 7).
---

# new-rpc

Atomik RPC'ler ilgili tüm yazmayı **tek transaction**'da yapar. Her RPC **tek imzalıdır**.

## İmza değiştirme disiplini (409 ambiguous önlenir)

```sql
-- 1) Eski imzayı TAM tip listesiyle kaldır
drop function if exists public.place_order_atomic(uuid, jsonb);

-- 2) Yeni imzayı oluştur
create or replace function public.place_order_atomic(
  p_relationship_id uuid,
  p_items jsonb,
  p_customer jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rel   public.relationships%rowtype;
  v_order uuid;
  v_prev  numeric;
begin
  select * into v_rel from public.relationships
   where id = p_relationship_id and status = 'active'
   for share;
  if not found then
    raise exception 'NO_ACTIVE_RELATIONSHIP' using errcode = '42501';
  end if;

  -- orders + order_items + ilk debit transaction TEK transaction'da.
  -- Denormalize org id'leri ilişkiden alınır (A16) — çağırandan ASLA.
  ...
  return v_order;
end;
$$;

-- 3) PostgREST şema cache
notify pgrst, 'reload schema';
```

## Ledger değişmezliği (kural 7)

- Kök siparişin ilk `debit` kaydına **UPDATE/DELETE yapılmaz**.
- İptal/iade/ödeme dahil her değişiklik **yeni INSERT** ile dengelenir.
- Bu davranış birim testle korunur, yorumla değil.

## Running balance (A18) — bakiye SUM ile hesaplanmaz

Milyonlarca satırda `SUM()` her ekran açılışında tam tarama demek. Her satır kendi
`balance_after` değerini taşır; güncel bakiye = ilişkinin son satırı.

```sql
-- Yarış koşulu: önceki satırı kilitle, sonra yaz.
select balance_after into v_prev
  from public.transactions
 where relationship_id = p_relationship_id
 order by created_at desc, id desc
 limit 1
   for update;

insert into public.transactions
  (relationship_id, manufacturer_org_id, retailer_org_id, type, amount, balance_after, ...)
values
  (p_relationship_id, v_rel.manufacturer_org_id, v_rel.retailer_org_id,
   'debit', v_amount, coalesce(v_prev, 0) + v_amount, ...);
```

## Fiyat kuralı (A4/A5)

Tutar **yalnız** `order_items.supplier_unit_price` üzerinden hesaplanır.
`product_costs` ve `retail_prices` cari hesaba **hiç girmez**.
İskonto (`relationships.discount_rate`) `supplier_unit_price`'a yazılırken uygulanır;
nihai net fiyat saklanır.

## Doğrulama

```bash
npm run db:reset
npm test -- ledger
```
Canlıda SQL değişikliği sonrası: `NOTIFY pgrst, 'reload schema';`
