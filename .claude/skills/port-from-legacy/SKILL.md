---
name: port-from-legacy
description: İki eski projeden (retailer-platform SAAS, furniture-platform) özellik taşırken izlenecek disiplin — org modeline çevirme, köprü kalıntısı temizliği, katman/bütçe uyumu. Faz 7-8 port işlerinde kullan.
---

# port-from-legacy

Kaynaklar:
- `C:\Users\cihat\Desktop\claude\retailer-platform SAAS` — tenant = perakendeci
- `C:\Users\cihat\Desktop\claude\furniture-platform` — tenant = üretici

İkisi birbirinin aynası. **Kod kopyalanmaz, çevrilir.**

## Adımlar

1. **Haritala.** `legacy-scout` agent'ı ile özelliğin nerede yaşadığını çıkar
   (tablolar, RPC'ler, sayfalar, hook'lar).
2. **Alan çevirisi tablosunu yaz.** Taşımadan önce her alanın yeni karşılığını belirle:

| Eski (A: retailer-platform) | Eski (B: furniture-platform) | KÖPRÜ |
|---|---|---|
| `retailer_profiles` | `users` (role=manufacturer) | `organizations` (`kind`) |
| `manufacturer_profiles.retailer_id` | `users.manufacturer_id` | `relationships` kenarı |
| `retailer_id` kolonu | `manufacturer_id` kolonu | `retailer_org_id` **+** `manufacturer_org_id` (denormalize, A16) |
| `users.role` | `users.role` | `users.org_role` + `organizations.kind` |
| `vkn` / `vkn_tc` (serbest metin) | `vkn_tc` (serbest metin) | `organizations.vkn_tc` UNIQUE NOT NULL + checksum |
| `products.cost_price` | `products.cost_price` | **`product_costs` ayrı tablo** (A4) |
| `order_items.unit_price` (perakende) | — | **`order_item_retail_prices` ayrı tablo** (A4) |
| `order_items.cost_price` | `products.price` | `order_items.supplier_unit_price` (ortak, A5) |
| `plan` / `PLAN_MODULES` | `plan` / `PLAN_MODULES` | `organizations.plan` + `src/constants/index.ts` |

3. **Köprü kalıntısı taraması.** Taşınan kodda `bridge_`, `is_shadow`, `pairing_code`,
   `outbound_secret`, `integrationBridge` geçiyorsa **taşıma** — o mantık artık gereksiz.
   `guard-write` zaten bloklar.
4. **Ölçek uyumu.** Eski kod `OFFSET`/`.range()` veya `select('*')` kullanıyorsa
   keyset + açık kolon listesine çevir (A17). Bakiye `SUM()` ile hesaplanıyorsa
   `balance_after` running balance'a çevir (A18).
5. **Katman ve bütçe uyumu.** Eski god component'ler bölünerek taşınır:
   `features/<ad>/{api,domain,components}` + `index.ts`. Dosya bütçesi (A19) uygulanır.
   `furniture-platform/src/App.tsx` (1700 satır) ve `components/LoginPage.tsx` (90 KB)
   **hiçbir koşulda olduğu gibi taşınmaz.**
6. **Onay al, sonra uygula.** Dokunulacak dosyaları ve çeviri tablosunu göster.

## Taşınmayacaklar

`docs/bridge-*.md` · `services/integrationBridge.ts` · `bridge_connections`, `bridge_sync_log` ·
hayalet kullanıcı mantığı · `password_hash` ve `migrate-users-to-auth` ·
commit'lenmiş `.env.local` sırları.
