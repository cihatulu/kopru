---
name: verify-rls
description: RLS izolasyonunu, güvenlik standartlarını ve ölçek (index/plan) sağlığını doğrula — Supabase MCP advisor + izolasyon testi + EXPLAIN kontrolü. RLS/policy/view/RPC değişikliği sonrası kullan.
---

# verify-rls

## 1. Supabase MCP advisor

- `get_advisors` (type: `security`) → RLS açık mı, politika eksik mi, view `security_invoker` mı,
  fonksiyonlarda `search_path` var mı.
- `get_advisors` (type: `performance`) → düz `auth.uid()` (initplan) uyarıları, eksik index.

## 2. Standart kontrol listesi

- [ ] Tüm tablolarda RLS **açık**
- [ ] Tüm politikalarda `(select auth.uid())`
- [ ] Tüm view `with (security_invoker = true)`
- [ ] Tüm fonksiyon `set search_path = public`
- [ ] `anon` yüzeyi minimum: yalnız public branding view + `order_token` ile takip
- [ ] Üretici cariyi (transactions) yalnız SELECT; INSERT/UPDATE yok (kural 8)
- [ ] HaveIBeenPwned koruması Auth ayarlarında açık

## 3. Ölçek kontrolü — bu projede zorunlu (A16/A17)

Hedef: 5.000 üretici × 50.000 perakendeci. RLS'in kendisi sorgu planını bozmamalı.

- [ ] Hiçbir politikada `relationship_id IN (SELECT ...)` **yok** — denormalize
      `manufacturer_org_id` / `retailer_org_id` eşitliği kullanılıyor
- [ ] Her işlem tablosunda `(manufacturer_org_id, created_at desc, id desc)` ve
      `(retailer_org_id, created_at desc, id desc)` bileşik index'i var
- [ ] Temsili liste sorgusunda plan doğru:

```sql
explain (analyze, buffers)
select id, order_no, status, created_at
  from public.orders
 order by created_at desc, id desc
 limit 25;
```
`Index Scan` görmelisin. **`Seq Scan` çıkarsa bu bir hatadır** (ERROR_PROTOCOLS #17).

## 4. İzolasyon testi

Ayrı test ortamında, `persistSession: false` zorunlu (aksi halde test client'ları birbirini ezer):

```bash
npm test -- rls
```

- Üretici org, ilişkisi olmayan siparişi göremez
- Perakendeci A, Perakendeci B'nin verisini göremez
- Misafir org, ilişkisi `passive` olduğunda o ilişkinin verisini göremez
- `staff` / `accountant` kendi org kapsamı dışına çıkamaz
- Platform admin org verisine yalnız admin yüzeyinden erişir

## 5. Sık hata

"infinite recursion in policy" → politika içinde aynı tabloyu sorgulama;
`SECURITY DEFINER STABLE` helper kullan (ERROR_PROTOCOLS #3).

> Fiyat kolonlarına dokunulduysa ayrıca `/verify-price-isolation` çalıştır.
