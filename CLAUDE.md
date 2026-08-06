# CLAUDE.md

Bu dosya KÖPRÜ deposunda çalışan Claude Code'a rehberlik eder. Talimatlar bağlayıcıdır.

## Başlamadan Önce Oku

Her görev öncesi `PLAN.md` (mimari, şema, RLS, iş kuralları, inşa sırası) ve
`.claude/ERROR_PROTOCOLS.md` (sık hatalar + kesin çözüm) dosyalarını oku.
Bu dosya özet + kilitli kurallardır; çakışmada `PLAN.md` ile birlikte değerlendir.

## Proje Genel Bakış

**KÖPRÜ** — üretici ve perakendecinin **aynı platformda** buluştuğu çok kiracılı B2B SaaS.
Sipariş, kısmi sevkiyat, iade, SSH, cari hesap, stok, katalog, duyuru, kampanya,
AI oda görselleştirme ve Lead/CRM modüllerini kapsar.

**Tenant = ilişki.** Ne üretici ne perakendeci tek başına tenant değildir; ikisi
arasındaki `relationships` satırıdır. Deployment: Vercel + Supabase.

**Organizasyon tipleri:** `manufacturer`, `retailer` — her ikisi de abone (`is_subscriber=true`)
veya misafir (`is_subscriber=false`) olabilir.
**Kullanıcı rolleri:** org içinde `owner` / `staff` / `accountant`; org dışında `platform_admin`.

**Hedef ölçek: ~5.000 üretici, ~50.000 perakendeci, ~500.000 ilişki, yılda ~5M sipariş.**
Her sorgu ve her index kararı bu ölçeğe göre verilir (PLAN §17).

### Üç fiyat katmanı — projenin en kritik kuralı

| Fiyat | Yaşadığı yer | Kim görür |
|---|---|---|
| Üretici maliyeti | `product_costs` (ayrı tablo) | Yalnız sahibi üretici |
| Üretici satışı = perakendeci maliyeti | `products.supplier_price`, `order_items.supplier_unit_price` | **Her iki taraf — carinin tek bazı** |
| Perakendeci satışı | `retail_prices`, `order_item_retail_prices` (ayrı tablolar) | Yalnız o perakendeci |

Gizli fiyatlar **ayrı tablolarda tutulur** — çünkü Postgres RLS kolon düzeyinde korumaz.
`products` tablosuna `cost_price`, `order_items` tablosuna `retail_unit_price`
kolonu **eklenmez**. Bu kural `guard-price-leak` hook'u ile zorlanır.

### Köprü yoktur

Bu proje iki eski SaaS'ın (retailer-platform, furniture-platform) birleşimidir.
Aralarındaki HMAC imzalı Edge Function köprüsü **kaldırılmıştır**. `bridge_*`,
`is_shadow`, `pairing_code`, `outbound_secret` gibi kavramlar bu kod tabanında
**yoktur ve eklenmez** (`guard-bridge-residue` hook'u bloklar).

## Tech Stack

React 19 + TypeScript (strict) + Tailwind CSS v4 + Vite 6 ·
@tanstack/react-query (sunucu durumu) · Zustand (yalnız sepet/UI) ·
react-hook-form + zod · Supabase (Auth, PostgreSQL + RLS + RPC + migrations,
Realtime, Storage, Edge Functions/Deno)

## Geliştirme Komutları

```bash
npm run dev          # Vite dev sunucusu
npm run build        # tsc --noEmit + production build
npm run lint         # tsc --noEmit + ESLint
npm test             # Vitest
npm run test:e2e     # Playwright
npm run db:reset     # supabase db reset — sıfır ortam doğrulaması
npm run gen:types    # supabase gen types → src/types/database.generated.ts
```

Edge Function deploy: `npx supabase functions deploy <ad>`
RPC değişikliği sonrası (SQL Editor): `NOTIFY pgrst, 'reload schema';`

## KİLİTLİ KURALLAR — Değiştirme

1. **Migration zorunlu.** Şema değişikliği yalnız migration ile; elle SQL yasak.
   `supabase db reset` ile sıfır ortam ayağa kalkmalı.
2. **Şifre tek yol.** Tüm şifre işlemleri yalnız `update-user-password` Edge Function
   (`auth.admin.*`). `password_hash` kolonu YOK. Frontend'den şifre yazılmaz.
3. **Giriş tek yol.** Kullanıcı arama + sponsor VKN doğrulama + kilit sayacı yalnız
   `login` Edge Function'da. İstemci `users` tablosunu sorgulayarak giriş yapmaz.
4. **RLS standartları.** Tüm politikalarda `(select auth.uid())`. Tüm view
   `WITH (security_invoker = true)`. Tüm fonksiyon `SET search_path = public`.
   Politika içinde aynı tabloyu sorgulama — `SECURITY DEFINER STABLE` helper kullan.
5. **Fiyat izolasyonu.** Gizli fiyatlar ayrı tablolarda. `products`'a `cost_price`,
   `order_items`'a `retail_unit_price` eklenmez. Snapshot'lar allowlist serializer ile
   üretilir, spread (`{...obj}`) ile değil.
6. **RPC tekilliği.** Her RPC tek imzalı. İmza değişiminde
   `DROP FUNCTION` → `CREATE` → `NOTIFY pgrst, 'reload schema'`. Overload bırakma.
7. **Ledger değişmezliği.** Kök siparişin ilk `debit` kaydına UPDATE/DELETE yapılmaz.
   Her düzeltme yeni INSERT ile dengelenir. Atomik RPC'ler tek transaction'da yazar.
   Güncel bakiye `SUM()` ile değil, son satırın `balance_after` değeriyle okunur.
8. **Cari yetkisi.** Cari revize/masraf/ödeme perakendeci veya accountant tarafından
   yapılır; üretici cariyi yalnızca izler (SELECT).
9. **İlişki kapsamı ve RLS anahtarı.** Her işlem satırı `manufacturer_org_id` ve
   `retailer_org_id` kolonlarını **denormalize taşır**; RLS bu kolonlar üzerinde
   eşitlikle çalışır. `relationship_id IN (SELECT ...)` deseni **yasak** — ölçekte çöker.
   Aynı `kind`'a sahip iki org arasında ilişki kurulamaz.
10. **`App.tsx` yalnız router.** İş mantığı/state/veri çekme buraya yazılmaz.
11. **Tek `src/constants/index.ts`.** Başka constants dosyası açılmaz.
12. **Sunucu durumu react-query'de.** Zustand'da sunucu verisi tutulmaz.
    `staleTime` her sorguda `STALE_TIME` sabitlerinden açıkça verilir.
13. **TS strict + ESLint zorunlu.** DB tipleri `npm run gen:types` ile üretilir;
    elle tip veya elle case-conversion katmanı yazılmaz.
14. **Stok** yazımı `update-stock` Edge Function (service role) ile; istemci doğrudan yazmaz.
15. **Plan gating çift katman:** frontend + RLS/Edge.
16. **Soft delete varsayılan** (`is_active=false`). Gerçek DELETE yalnız admin'in
    cascade RPC'si ile ve yalnız pasifleştirilmiş kayıtlar için.
17. **`system_logs`** aylık partition + 90 gün retention (eski partition DROP edilir).
    **Storage** bucket'ları private; public listing kapalı.
18. **VKN/TCKN** `organizations.vkn_tc` UNIQUE NOT NULL; `src/lib/tckn.ts` checksum
    doğrulaması hem formda hem DB CHECK'te uygulanır.
19. **Sorgu şekli.** Liste sorguları **keyset (cursor) pagination** kullanır; `OFFSET`
    ve `.range()` yasak. Kolon listeleri **açıkça yazılır**; `select('*')` yasak.
20. **Dosya bütçesi ve katman sınırı.** Aşağıdaki iki bölüm bağlayıcıdır; hook'lar bloklar.

## Dosya Bütçesi — aşan yazım BLOKLANIR

| Dosya | Üst sınır |
|---|---|
| `src/components/**/*.tsx` | 200 satır |
| `src/pages/**/*.tsx` | 150 satır |
| `src/features/*/api/*.ts` | 150 satır |
| `src/features/*/domain/*.ts` | 200 satır |

Sınıra yaklaşan dosya bölünür. "Sonra bölerim" yoktur — furniture-platform'daki
1700 satırlık `App.tsx` tam olarak böyle oluştu.

## Katman Kuralları — ihlal BLOKLANIR

```
app/                  router, guard, provider. İş mantığı YOK.
pages/                yalnız kompozisyon. supabase / useQuery / iş mantığı YOK.
features/<ad>/api     Supabase'e dokunan TEK yer. react-query hook'ları burada.
features/<ad>/domain  SAF mantık. react / @supabase / DOM import YOK. %90 test kapsamı.
features/<ad>/components  sunum + form. Doğrudan supabase çağrısı YOK.
features/<ad>/index.ts    public yüzey — dışarıya SADECE bu görünür.
components/ui/        presentational. Veri çekmez, feature import etmez.
lib/                  yardımcı. features/ veya pages/ import etmez.
```

Bir feature başka bir feature'ın **iç dosyasını** import edemez; yalnız
`@/features/<ad>` public yüzeyini kullanır (ESLint `no-restricted-imports`).

## Çalışma Döngüsü

**Tespit → Açıkla → Onay Al → Uygula → Rapor Ver.**

- Her değişiklikten önce dokunulacak dosyaları listele, etkilenen component/prop/politikaları
  göster, onay al, sonra uygula.
- Anlamadığını tahmin etme, sor. Kapsam dışına çıkma.
- Açıklamalar Türkçe.
- Hata alındığında önce `.claude/ERROR_PROTOCOLS.md`'ye bak; listede yoksa çöz ve
  **maddeyi listeye ekle**. Hook bir yazımı bloklarsa hook'u devre dışı bırakma, kuralı uygula.

## Git Kuralları

- "Commit et" → yalnız `git add` + `git commit`. Push yapılmaz.
- "Push et" → yalnız `git push`.
- Sırlar (`SUPABASE_ACCESS_TOKEN`, `GITHUB_TOKEN`, service role key) hiçbir zaman
  commit'lenmez. `.mcp.json` yalnız `${ENV_VAR}` interpolation kullanır.
  Service role key frontend bundle'ına **girmez** — yalnız Edge Function'da
  `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`.

## Dizin Yapısı

```
src/
  app/          router.tsx, guards.tsx, providers.tsx, roleHome.ts, layout/
  features/     <ad>/{api,domain,components} + index.ts  — tek desen
  pages/        auth/ admin/ manufacturer/ retailer/ shared/
  components/ui/
  constants/index.ts        # TEK constants dosyası
  lib/          supabase.ts, planGating.ts, tckn.ts, format.ts
  types/        index.ts, database.generated.ts
  test/         setup.ts, rls.test.ts, price-isolation.test.ts
supabase/
  migrations/   *.sql
  functions/    _shared/, login, update-user-password, update-stock, ...
e2e/            auth.spec.ts, upgrade.spec.ts, relationship.spec.ts
```
