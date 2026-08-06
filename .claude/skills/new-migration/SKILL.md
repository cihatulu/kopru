---
name: new-migration
description: Yeni Supabase migration oluştur — RLS açık, (select auth.uid()), denormalize org id anahtarı, security_invoker view, SET search_path=public iskeletiyle. Şema değişikliği gerektiğinde kullan (kilitli kural 1, 4, 9).
---

# new-migration

Şema değişikliği **yalnız migration ile** yapılır. Elle SQL yasak (`guard-bash` bloklar).

## Adımlar

1. `supabase migration new <açıklayıcı_ad>` → `supabase/migrations/<timestamp>_<ad>.sql`
2. Dosyayı aşağıdaki standartlara göre doldur (`guard-write` bunları zorlar).
3. `npm run db:reset` — sıfır ortamda doğrula.
4. `npm run db:diff` — drift kontrolü.
5. Tip değişikliği varsa `npm run gen:types`.
6. RLS'e dokunulduysa `/verify-rls`; fiyat kolonuna dokunulduysa `/verify-price-isolation`.

## Zorunlu standartlar

- Her tablo: `uuid` PK (`gen_random_uuid()`), `created_at`/`updated_at`, `enable row level security`.
- Tüm politikalarda `(select auth.uid())` — düz `auth.uid()` YASAK.
- Tüm view: `with (security_invoker = true)`.
- Tüm fonksiyon: `set search_path = public`.
- Silme: soft delete (`is_active = false`); gerçek DELETE politikası yok.

## İşlem tablosu şablonu — denormalize org id (A16)

Ölçek kuralı: RLS anahtarı `relationship_id` **değil**, iki taraf da denormalize tutulur.
`relationship_id IN (SELECT ...)` 10.000 perakendecili bir üreticide çöker.

```sql
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id),
  -- Denormalize (A16) — RLS ve pagination bu kolonlar üzerinden çalışır.
  manufacturer_org_id uuid not null references public.organizations(id),
  retailer_org_id     uuid not null references public.organizations(id),
  ...
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

-- Hem RLS hem keyset pagination AYNI index'i kullanır (A17).
create index orders_mfr_idx on public.orders (manufacturer_org_id, created_at desc, id desc);
create index orders_rtl_idx on public.orders (retailer_org_id,     created_at desc, id desc);

create policy "orders_select_own"
on public.orders for select to authenticated
using (
  manufacturer_org_id = (select public.get_my_org_id())
  or retailer_org_id  = (select public.get_my_org_id())
);
```

**Tutarlılık:** denormalize kolonların `relationships` satırıyla uyumu trigger ile doğrulanır —
`orders.manufacturer_org_id` o `relationship_id`'nin üreticisi olmak zorunda.

## Yardımcı fonksiyon şablonu

```sql
create or replace function public.get_my_org_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select org_id from public.users where id = (select auth.uid());
$$;
```

## Log tablosu — partition (kural 17)

`system_logs`, `order_status_logs` `created_at` ile aylık `PARTITION BY RANGE`.
90 gün retention eski partition'ı `DROP` eder — `DELETE` değil.

> RPC ekliyorsan `/new-rpc` skill'ini kullan.
