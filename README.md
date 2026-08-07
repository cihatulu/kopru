# KÖPRÜ

Üretici ve perakendecinin **aynı platformda** buluştuğu çok kiracılı B2B SaaS.

İki ayrı SaaS'ın (`retailer-platform`, `furniture-platform`) birleşimidir. Aralarındaki
HMAC imzalı Edge Function köprüsü kaldırılmıştır — tek veritabanı, tek uygulama.

## Temel mimari

**Tenant = ilişki.** Ne üretici ne perakendeci tek başına tenant değildir; ikisi
arasındaki `relationships` satırıdır.

**Misafir = bir bayrak.** "Bizden hizmet almayan" taraf `is_subscriber=false` olan
normal bir organizasyon satırıdır. Bu yüzden **aboneye yükseltme veri taşımaz** —
misafir zaten grafın içindedir, ilişkileri ve geçmişi olduğu yerde kalır.

**VKN yakınsama anahtarıdır.** `organizations.vkn_tc` UNIQUE ve checksum'lıdır; iki
abone birbirini eklediğinde aynı düğümde birleşir. Köprünün eşleşme kodu, secret
alışverişi ve idempotency katmanı bu tek kısıtla gereksizleşti.

### Üç fiyat katmanı

| Katman | Nerede | Kim görür |
|---|---|---|
| Üretici maliyeti | `product_costs` | yalnız sahibi üretici |
| Üretici satışı = perakendeci maliyeti | `products.supplier_price`, `order_items.supplier_unit_price` | **iki taraf — carinin tek bazı** |
| Perakendeci satışı | `retail_prices`, `order_item_retail_prices` | yalnız o perakendeci |

Gizli fiyatlar **ayrı tablolardadır**, çünkü Postgres RLS kolon düzeyinde koruma
sağlamaz. `products`'a `cost_price`, `order_items`'a `retail_unit_price` eklenemez —
bir hook bloklar, bir test korur.

## Kurulum

```bash
npm install
cp .env.example .env.local     # VITE_SUPABASE_URL ve ANON_KEY doldur
npm run dev                    # http://localhost:5180
```

Sırlar **proje başına** `.claude/settings.local.json` içinde tutulur (git-ignored).
Makine geneli ortam değişkeni kullanmayın — her projeye sızar ve CLI girişlerini ezer.
Ayrıntı: `.claude/README.md`.

## Komutlar

```bash
npm run dev          # geliştirme sunucusu (port 5180, strictPort)
npm run lint         # tsc --noEmit + ESLint
npm test             # Vitest
npm run test:e2e     # Playwright
npm run build        # production build
npm run db:push      # migration'ları uzak veritabanına uygula
npm run gen:types    # şemadan TypeScript tipleri üret
node scripts/seed.mjs  # test verisi (idempotent, otoriter)
```

## Yapı

```
src/
  app/        router, guards, layout
  features/   <ad>/{api,domain,components} + index.ts
  pages/      yalnız kompozisyon
  lib/        supabase, tckn, format
supabase/
  migrations/ şemanın tek kaynağı
  functions/  login, admin-provision-owner
e2e/          Playwright senaryoları
scripts/      seed.mjs
```

Katman ve dosya bütçesi kuralları `CLAUDE.md`'de; hook'lar zorlar.

## Giriş akışı

Açılışta hiçbir form alanı yoktur — yalnız üç buton: **Üretici · Perakendeci · Admin**.
Her portalın altında iki yol:

- **Abone**: kendi VKN/TCKN + şifre
- **Misafir**: kendisini ekleyen abonenin VKN'si + kendi kodu + şifre

Sponsor VKN bir kolaylık değil, **kimlik faktörüdür**; sunucuda aktif ilişkiye karşı
doğrulanır. Tüm doğrulama `login` Edge Function'ındadır — istemci `users` tablosunu
sorgulamaz.

Admin `admincyo` subdomain'inden ve e-posta ile girer (platform admini bir org'a
bağlı değildir, dolayısıyla VKN'si yoktur).

## Yayın

Vercel + Supabase. `vercel.json` SPA rewrite ve güvenlik başlıklarını içerir.
Subdomain bazlı çok kiracılılık için `*.alanadi.com` wildcard DNS gerekir.

## Belgeler

- `PLAN.md` — mimari kararlar (A1–A20), ölçek hedefleri, faz planı
- `CLAUDE.md` — kilitli kurallar, katman ve bütçe sınırları
- `.claude/ERROR_PROTOCOLS.md` — sık hatalar ve kesin çözümleri
