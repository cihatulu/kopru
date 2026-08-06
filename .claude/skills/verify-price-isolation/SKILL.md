---
name: verify-price-isolation
description: Üç fiyat katmanının sızmadığını doğrula — şema assertion + rol bazlı erişim testi. Fiyat, ürün, sipariş veya snapshot kodu değiştiğinde MUTLAKA çalıştır (kilitli kural 5 / A4).
---

# verify-price-isolation

Projenin en yüksek riskli kuralı. Köprü çağında izolasyon "o alanı hiç göndermemek"ti;
tek veritabanında bu koruma kendiliğinden **kaybolur**. Yanlış yaparsak üretici
perakendecinin kâr marjını, perakendeci üreticinin maliyetini görür.

## Üç katman

| Fiyat | Tablo | Kim görür |
|---|---|---|
| Üretici maliyeti | `product_costs` | yalnız sahibi üretici |
| Üretici satışı = perakendeci maliyeti | `products.supplier_price`, `order_items.supplier_unit_price` | her iki taraf — carinin tek bazı |
| Perakendeci satışı | `retail_prices`, `order_item_retail_prices` | yalnız o perakendeci |

## 1. Şema assertion — yasak kolon var mı

```sql
select table_name, column_name
  from information_schema.columns
 where table_schema = 'public'
   and (   (table_name = 'products'    and column_name in ('cost_price','retail_price'))
        or (table_name = 'order_items' and column_name in ('retail_unit_price','cost_price')) );
```
**0 satır dönmeli.** Satır dönerse kolonu ayrı tabloya taşı (ERROR_PROTOCOLS #13).

## 2. Rol bazlı erişim testi

```bash
npm test -- price-isolation
```

`src/test/price-isolation.test.ts` şunları doğrular (`persistSession: false` zorunlu):

- Üretici oturumu → `retail_prices` **0 satır**
- Üretici oturumu → `order_item_retail_prices` **0 satır**
- Perakendeci oturumu → `product_costs` **0 satır**
- Her iki taraf → `order_items.supplier_unit_price` **aynı değeri** görür
- Perakendeci A → Perakendeci B'nin `retail_prices` satırını göremez

## 3. Kod tarafı kontrol listesi

- [ ] `select('*')` hiçbir yerde yok — `api/columns.ts` açık kolon listeleri kullanılıyor
- [ ] `product_snapshot` / `items_snapshot` allowlist serializer ile üretiliyor
      (`features/orders/domain/snapshot.ts`), spread `{...obj}` ile **değil**
- [ ] Cari tutarı yalnız `supplier_unit_price` üzerinden hesaplanıyor (A5)
- [ ] İskonto `supplier_unit_price`'a yazılırken uygulanmış; ikinci kez uygulanmıyor

## 4. Supabase MCP advisor

`get_advisors` (type: `security`) → `product_costs`, `retail_prices`,
`order_item_retail_prices` tablolarında RLS açık ve politika var mı.
