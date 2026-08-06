# KÖPRÜ — Birleşik B2B Platform Planı

## Context

Bugün elimizde birbirinin **aynası** iki ayrı SaaS var:

| | retailer-platform SAAS | furniture-platform |
|---|---|---|
| Tenant | perakendeci | üretici |
| Karşı taraf | `manufacturer_profiles.retailer_id NOT NULL` — üretici, perakendeciye ait | `users.manufacturer_id` — perakendeci, üreticiye ait |
| Giriş | e-posta + şifre | `user_code` + şifre (sentetik e-posta ile Supabase Auth) |
| Supabase | `qykgoqqopoqasmplzzlu` | `vyvaswrtipahdhqlptnt` |
| Mimari | React 19 + react-query + feature klasörleri + router/guards, 77 migration | 1700 satırlık `App.tsx`, 90KB kilitli `LoginPage.tsx`, 33 migration |

İkisi ayrı satıldığı için aralarında **köprü** kurulmuştu: iki Supabase projesi arasında HMAC-SHA256 imzalı Edge Function ↔ Edge Function senkronu, eşleşme kodu, hayalet kullanıcı kayıtları, `bridge_sync_log` idempotency (`furniture-platform/docs/bridge-protocol.md`, `bridge-plan.md`; `retailer-platform SAAS/src/services/integrationBridge.ts` placeholder).

**Bu plan köprüyü tamamen ortadan kaldırır.** Tek veritabanı, tek uygulama. Köprünün çözmeye çalıştığı her problem (kimlik eşleme, fiyat sızdırmazlığı, olay senkronu, idempotency) şema seviyesinde çözülür.

Hedef davranış:
1. Giriş ekranında hiçbir form yok — sadece **Üretici Üye Girişi / Perakendeci Üye Girişi / Admin** butonları. Butona tıklanmadan o tarafın alanları gelmez.
2. Her iki butonun altında iki yol: **abone** (kendi VKN/TCKN + şifre) ve **misafir** (kendisini açan abonenin VKN'si + kendi VKN/TCKN + şifre).
3. Taraflar etkileşimli: abone üretici kendi perakendecilerini, abone perakendeci kendi üreticilerini ekleyerek ekosistemi büyütür.
4. Misafir bir organizasyon **tek tıkla aboneye** dönüşür — veri taşıma olmadan, mevcut ilişkileri bozulmadan.

**Karar:** `C:\Users\cihat\Desktop\claude\KÖPRÜ` altında sıfırdan yeni proje. Temiz Supabase projesi, veri taşıma yok. İki mevcut projeden kod ve şema parça parça alınır (aşağıda §9).

---

## 1. Temel mimari kararı — organizasyon grafiği

Köprünün varlık sebebi, iki tarafın da "tenant benim" varsayımıyla yazılmış olmasıydı. Yeni model bu varsayımı kaldırır:

```
organizations (kind = manufacturer | retailer, is_subscriber = true | false)
      │
      └── relationships (manufacturer_org_id ↔ retailer_org_id)   ← ticari ilişki = tenant birimi
```

- **Tenant artık taraf değil, ilişkidir.** Sipariş, cari, SSH, iade, duyuru → hepsi bir `relationship_id`'ye asılır.
- **Misafir de gerçek bir düğümdür.** "Bizden hizmet almayan" taraf `is_subscriber = false` olan normal bir `organizations` satırıdır — hayalet kayıt, `is_shadow` bayrağı, ayna tablo yok.
- **Aboneye yükseltme = bir flag.** Misafir zaten grafın içinde olduğu için yükseltme sırasında hiçbir satır taşınmaz; sadece `is_subscriber=true` + plan + subdomain + kimlik bilgisi açılır. Geçmiş siparişleri ve cari bakiyesi olduğu yerde kalır.
- **Yakınsama.** İki abone birbirini VKN ile eklediğinde aynı `organizations` satırına bağlanır → tek kenar. Köprünün "kimlik eşleme" bölümü (önce VKN, sonra e-posta, yoksa hayalet aç) tamamen gereksizleşir.

---

## 2. Veri modeli

### 2.1 Kimlik

| Tablo | Amaç |
|---|---|
| `organizations` | `id`, `kind` (`manufacturer`\|`retailer`), `company_name`, **`vkn_tc` UNIQUE NOT NULL**, `email`, `phone`, `address`, `authorized_name`, `is_subscriber`, `plan` (`free`\|`basic`\|`pro`), `enabled_modules jsonb`, `branding jsonb` (logo, renkler, `subdomain`), `is_active`, `created_by_org_id` (kim açtı — misafirin sponsoru), `created_at` |
| `users` | `id` → `auth.users`, `org_id` → `organizations`, `org_role` (`owner`\|`staff`\|`accountant`), **`user_code`** (= org'un VKN/TCKN'si; owner için org.vkn_tc, personel için türetilmiş), `email`, `is_active`, `failed_attempts`, `locked_until` |
| `relationships` | `id`, `manufacturer_org_id`, `retailer_org_id`, `status` (`pending`\|`active`\|`passive`), `initiated_by_org_id`, `discount_rate`, `created_at`. **UNIQUE (manufacturer_org_id, retailer_org_id)** |
| `platform_admins` | `user_id` — bizim ekip. Hiçbir org'a bağlı değil. |
| `subscription_requests` | Misafirin "abone olmak istiyorum" talebi; admin tek tıkla onaylar. |

`vkn_tc` artık **UNIQUE ve zorunlu** — hem giriş kimliği hem de organizasyonların yakınsama anahtarı. Her iki eski projede de bu alan serbest metindi ve doğrulanmıyordu; burada TCKN mod-11 ve VKN checksum doğrulaması eklenir (`src/lib/tckn.ts`).

### 2.2 İşlem tabloları (hepsi `relationship_id` üzerinden)

`orders`, `order_items`, `order_status_logs`, `transactions` (cari), `ssh_requests`, `return_requests`, `announcements`, `announcement_reads`, `order_sequences`.

`products`, `product_groups`, `product_costs`, `stock` → üretici org'a ait (`owner_org_id`).
`retail_prices`, `retailer_stock`, `retailer_finance_transactions`, `campaign_*`, `sales_reports`, `room_stagings` → perakendeci org'a ait.

### 2.3 RLS yardımcıları

Her iki eski projedeki `get_my_role()` / `get_my_retailer_id()` / `get_my_manufacturer_id()` deseni korunur, org'a çevrilir:

```sql
get_my_user_id()     -- auth.uid() → public.users.id
get_my_org_id()      -- users.org_id
get_my_org_kind()    -- organizations.kind
is_platform_admin()  -- platform_admins tablosunda mı
my_relationship_ids()-- org'umun taraf olduğu tüm relationship id'leri (STABLE, indexli)
```

Fonksiyonlar `SECURITY DEFINER STABLE`, `search_path` sabitlenmiş, `(select auth.uid())` sarmalı ile.

**Ölçek düzeltmesi — RLS anahtarı `relationship_id` DEĞİL, denormalize org id'leridir.**
`relationship_id IN (SELECT my_relationship_ids())` deseni 10.000 perakendecisi olan bir üretici için her sorguda 10.000 UUID'lik küme materyalize eder — bu ölçekte kullanılamaz. Bunun yerine her işlem satırında **iki taraf da denormalize tutulur**:

```sql
orders (
  id, relationship_id,
  manufacturer_org_id uuid not null,   -- denormalize
  retailer_org_id     uuid not null,   -- denormalize
  ...
)
```

Politika tek indexli eşitliğe iner:
```sql
using ( manufacturer_org_id = (select get_my_org_id())
     or retailer_org_id     = (select get_my_org_id()) )
```
Her iki kolona da index; Postgres BitmapOr ile birini anında eler. `my_relationship_ids()` yalnızca **admin/rapor** sorgularında kullanılır, RLS sıcak yolunda değil. Denormalize alanların `relationships` satırıyla tutarlılığı CHECK + trigger ile garanti edilir; `relationship_id` iskonto/durum için join anahtarı olarak kalır.

---

## 3. Üç fiyat katmanı — sızdırmazlık şema ile sağlanır

Köprüde fiyat izolasyonu "o alanı hiç göndermemek" ile sağlanıyordu (`bridge-protocol.md §1`, yasak alan listesi). Tek veritabanında bu koruma **kaybolur** — bu, birleştirmenin en kritik riski. Postgres'te RLS satır düzeyindedir, kolon düzeyinde değildir; `GRANT SELECT (col)` PostgREST ile kırılgandır. Bu yüzden **gizli fiyatlar ayrı tablolara ayrılır** ve sızıntı yapısal olarak imkânsız hale getirilir:

| # | Fiyat | Yaşadığı yer | Kim görür |
|---|---|---|---|
| 1 | **Üretici maliyeti** | `product_costs (product_id, cost_price)` | Yalnız sahibi üretici org |
| 2 | **Üretici satış = perakendeci maliyeti** | `products.supplier_price` · `order_items.supplier_unit_price` | **Her iki taraf — cari ekstrenin tek bazı** |
| 3 | **Perakendeci satış fiyatı** | `retail_prices (retailer_org_id, product_id, retail_price)` · `order_item_retail_prices (order_item_id, retail_unit_price)` | Yalnız o perakendeci org |

Kurallar:
- `transactions` (cari) **yalnızca** `supplier_unit_price` üzerinden hesaplanır. Tutar hesabı `place_order_atomic` / `ship_order_atomic` RPC'lerinin içinde, `order_items.supplier_unit_price` snapshot'ından yapılır.
- `products` tablosunda `cost_price` **kolonu bulunmaz**. `order_items` tablosunda `retail_unit_price` **kolonu bulunmaz**. Yanlışlıkla `select('*')` yazan bir geliştirici bile gizli fiyatı çekemez.
- İskonto (`relationships.discount_rate`) `supplier_unit_price`'a **yazılırken** uygulanır; nihai net fiyat saklanır (köprü protokolündeki karar korunur).
- `product_snapshot` / `items_snapshot` jsonb alanları allowlist serializer ile üretilir (`src/features/orders/domain/snapshot.ts`), spread ile değil.
- Doğrulama: `src/test/price-isolation.test.ts` — üretici oturumuyla `retail_prices` ve `order_item_retail_prices`, perakendeci oturumuyla `product_costs` sorgulanır; her ikisi de **0 satır** dönmeli.

---

## 4. Giriş akışı

### 4.1 Ekran

`src/pages/auth/LoginPage.tsx` — açılışta **hiçbir input yok**, üç buton:

```
[ Üretici Üye Girişi ]   [ Perakendeci Üye Girişi ]   [ Admin Girişi ]
```

Tıklanınca o portalın iki seçeneği açılır (aynı sayfada, `portal` + `mode` state'i; ayrı route değil):

**Üretici → mod seçimi**
- `Bizden hizmet alan üretici` → **VKN/TCKN + şifre**
- `Perakendeci daveti ile üretici` → **Beni ekleyen perakendecinin VKN'si + kendi VKN/TCKN'im + şifre**

**Perakendeci → mod seçimi** (tam ayna)
- `Bizden hizmet alan perakendeci` → **VKN/TCKN + şifre**
- `Üretici daveti ile perakendeci` → **Beni ekleyen üreticinin VKN'si + kendi VKN/TCKN'im + şifre**

**Admin** → ayrı form, yalnızca rezerve `admincyo` subdomain'inde çalışır (her iki eski projedeki kural korunur).

### 4.2 Kimlik doğrulama mekaniği

Supabase Auth e-posta ister; furniture-platform'daki sentetik e-posta deseni (`${users.id}@platform.local`) korunur. Ancak arama **istemcide yapılmaz** — kullanıcı numaralandırma açığı ve misafir modundaki sponsor kontrolü yüzünden tek bir Edge Function'a taşınır:

`supabase/functions/login/index.ts` (service-role, `--no-verify-jwt`):
1. `{ portal, mode, userCode, sponsorVkn?, password }` al.
2. `userCode` → `users` + `organizations`. `organizations.kind` ile `portal` uyuşmalı.
3. `mode = 'subscriber'` → `organizations.is_subscriber` **true** olmalı.
4. `mode = 'guest'` → `is_subscriber` **false** olmalı **ve** `sponsorVkn`'e karşılık gelen org ile aramızda `status='active'` bir `relationships` satırı bulunmalı. Yoksa `403 NO_ACTIVE_RELATIONSHIP`.
5. `is_active`, `locked_until` kontrolü → `signInWithPassword(sentetik_email, password)` → başarısızsa `failed_attempts++`, 5'te 30 sn kilit.
6. Session döner; istemci `supabase.auth.setSession()` ile kurar.

Tüm hata yolları tek tip mesaj döner (`Giriş bilgileri hatalı`) — hangi adımda düştüğü sızdırılmaz.

Şifre yazımı **yalnızca** `update-user-password` Edge Function üzerinden (her iki eski projenin de değişmez kuralı). `password_hash` kolonu yeni şemada **hiç yok** — furniture-platform'daki düz metin şifre / çift hash tehlikesi baştan ortadan kalkar.

### 4.3 Oturum sonrası

- `src/app/roleHome.ts` → `org.kind` + `is_subscriber` + `org_role`'e göre ana sayfa.
- `src/app/guards.tsx` → `RequireAuth`, `RequireOrgKind`, `RequireSubscriber`, `RequirePlatformAdmin`.
- Misafirin birden fazla sponsoru olabilir; girişte verilen `sponsorVkn` **varsayılan çalışma alanını** seçer (localStorage'a yazılır, üstteki seçiciden değiştirilebilir). Bu bir güvenlik sınırı değildir — misafir zaten kendi tüm ilişkilerinin verisine sahiptir; RLS `my_relationship_ids()` üzerinden çalışır.

---

## 5. Tek tıkla aboneye yükseltme

`upgrade_org_to_subscriber(p_org_id, p_plan, p_subdomain)` — `SECURITY DEFINER`, yalnız `is_platform_admin()`:

1. `organizations`: `is_subscriber=true`, `plan`, `branding.subdomain`, varsayılan `enabled_modules`.
2. Owner kullanıcısı yoksa oluştur (`user_code = org.vkn_tc`); şifre kurulumu `update-user-password` + davet e-postası ile.
3. **Mevcut `relationships` satırlarına dokunulmaz.** Yükselen org artık hem kendi panelinde çalışır hem eski sponsorunun müşterisi olarak kalır — sipariş geçmişi, cari bakiye, SSH kayıtları aynı yerde.
4. `system_logs`'a yazılır.

İki giriş noktası:
- **Admin paneli** → org satırındaki `Aboneye Yükselt` butonu (tek tık, plan seçimi modalı).
- **Misafirin kendi paneli** → `Kendi panelimi açmak istiyorum` → `subscription_requests` satırı → admin listesinde tek tıkla onay.

Ters yön için `downgrade_org_to_guest(p_org_id)` de tanımlanır (abonelik biter, veri durur, panel kapanır).

---

## 6. Ekosistem büyütme — köprü eşleşmesinin yerine geçen akış

`add_counterparty(p_vkn_tc, p_company_name, p_email, p_phone, ...)` — `SECURITY DEFINER`, çağıran abone org:

- **VKN sistemde yok** → yeni `organizations` satırı (`is_subscriber=false`, `created_by_org_id = ben`, karşı `kind`) + `relationships` satırı `status='active'`. Karşı tarafa giriş bilgileri iletilir; o artık **benim VKN'mle** giriş yapar.
- **VKN var, karşı taraf misafir** → mevcut org'a yeni bir `relationships` kenarı, `status='active'`. Aynı misafir birden fazla aboneye bağlanabilir; kopya org açılmaz.
- **VKN var, karşı taraf abone** → `status='pending'` kenar. Karşı tarafın panelinde `Gelen bağlantı istekleri` bildirimi çıkar; onaylayınca `active` olur. **Köprünün 8 haneli eşleşme kodu, HMAC imzası, `outbound_secret` alışverişi ve `bridge_sync_log` idempotency katmanının tamamı bu tek onay adımıyla yerini bulur.**

Kural: `kind` aynı olan iki org arasında ilişki kurulamaz (CHECK + RPC kontrolü).

---

## 7. Admin paneli

`/admin` altında, `is_platform_admin()` korumalı:

- **Üretici Yönet** — `organizations WHERE kind='manufacturer'`. Sütunlar: firma, VKN, abone/misafir rozeti, plan, modüller, aktif ilişki sayısı, durum. Eylemler: oluştur, düzenle, plan/modül değiştir, pasifleştir, **Aboneye Yükselt**, sil (cascade RPC).
- **Perakendeci Yönet** — aynısı `kind='retailer'` için.
- **İlişkiler** — tüm `relationships` grafiği, bekleyen istekler, elle bağlama/koparma.
- **Abonelik Talepleri** — `subscription_requests` kuyruğu, tek tık onay.
- **Sistem Logları**, **Lead/CRM**, **AI Analiz Raporları** (furniture-platform'dan port).

Kaynak referanslar: `retailer-platform SAAS/src/pages/admin/AdminRetailersPage.tsx` (plan/modül/VKN düzenleme deseni), `furniture-platform/components/admin/ManufacturerManagementPage.tsx` (onay/limit deseni).

---

## 8. Teknoloji yığını

retailer-platform SAAS'ın yığını birebir alınır (kanıtlanmış ve modern):

React 19 · TypeScript 5.8 strict · Vite 6 · Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first) · `react-router-dom` v7 `createBrowserRouter` · `@tanstack/react-query` v5 (tek sunucu-state kaynağı) · `zustand` v5 (yalnız sepet/UI) · `react-hook-form` + `zod` · Supabase (Postgres + RLS + RPC + Realtime + Storage + Deno Edge Functions) · Vitest + Testing Library · Playwright · ESLint 9 flat + Prettier · Vercel.

Korunacak proje kuralları (her iki `CLAUDE.md`'den): tek `src/constants/index.ts`, sunucu verisi asla zustand'da, şifre yazımı yalnız Edge Function'dan, `npm run gen:types` ile üretilen `database.generated.ts`, feature klasörü deseni (`features/<ad>/{api,components,domain}`).

---

## 9. Modül envanteri — iki projeden ne alınıyor

**retailer-platform SAAS'tan (yapı + modüller):**
`src/app/{router,guards,providers,roleHome}` · `src/features/*` deseni · atomik RPC'ler (`place_order_atomic`, `ship_order_atomic`, `cancel_order_atomic`, `confirm_return_atomic`, `confirm_delivery`, `track_order`) · kısmi sevkiyat (`parent_order_id` ağacı) · plan gating (`src/lib/planGating.ts` + `PLAN_MODULES`) · finans modülü · e-posta kampanyaları · AI oda görselleştirme (`room_stagings` + `ai-server/` + `stage-room`) · public sipariş takip (`/track/:token`) · RLS test paketi · Playwright e2e.

**furniture-platform'dan (özellikler):**
`announcements` + `announcement_reads` · Lead/CRM modülü (`leads`, `lead_campaigns`, `lead_emails`, `lead_search_queue`, `lead_activity_log`, Tavily + Resend) · AI analiz raporları (`manufacturer_reports`, `market_reports`) · `order_sequences` (okunabilir sipariş numarası) · üretici personeli (yeni modelde `users.org_role='staff'`) · ürün seti/limit mantığı (`getProductLimit`/`getSetLimit`) · `constants/turkey-geography.ts`, `lead-categories.ts` · `utils/caseUtils.ts` (snake↔camel).

**Alınmayacaklar:** tüm köprü katmanı (`docs/bridge-*.md`, `integrationBridge.ts`, `bridge_connections`, `bridge_sync_log`, hayalet kullanıcı mantığı, `is_shadow`) · `password_hash` kolonu ve `migrate-users-to-auth` · furniture'ın 1700 satırlık `App.tsx` ve 90KB `LoginPage.tsx` (yeniden yazılır) · `.env.local`'daki commit'lenmiş sırlar.

---

## 10. Uygulama sırası

| Faz | İçerik | Çıktı |
|---|---|---|
| **0** | `KÖPRÜ/` iskeleti: Vite + TS + Tailwind + ESLint/Prettier, yeni Supabase projesi, `.env.example`, `CLAUDE.md` | `npm run dev` çalışır |
| **1** | `20260806000000_initial_schema.sql`: `organizations`, `users`, `relationships`, `platform_admins`, enum'lar, RLS yardımcıları, temel politikalar | `npm run gen:types` tip üretir |
| **2** | Fiyat katmanı şeması: `products`, `product_costs`, `retail_prices`, `stock` + izolasyon politikaları | `price-isolation.test.ts` yeşil |
| **3** | Auth: `login` Edge Function, `update-user-password`, `LoginPage` (3 buton → 2 mod), guards, `roleHome`, TCKN/VKN doğrulama | 5 giriş yolu çalışır |
| **4** | Admin paneli: Üretici Yönet / Perakendeci Yönet / İlişkiler / Talepler + `upgrade_org_to_subscriber` | Tek tık yükseltme çalışır |
| **5** | `add_counterparty` + ilişki daveti/onay akışı, her iki tarafın "müşterilerim/tedarikçilerim" ekranı | Ekosistem büyüyor |
| **6** | Katalog, stok, sipariş yaşam döngüsü, atomik RPC'ler, cari ekstre | Uçtan uca sipariş |
| **7** | İkincil modüller: SSH, iade, duyuru, raporlar, finans, kampanya, AI oda | Plan gating aktif |
| **8** | furniture port'ları: Lead/CRM, AI analiz raporları, sipariş numarası sayacı | Özellik paritesi |
| **9** | Test paketi, seed script, Vercel + subdomain yapılandırması | Yayına hazır |

---

## 11. Doğrulama

**Şema/RLS** — `src/test/rls.test.ts` (furniture-platform'daki 29 testlik canlı-DB deseni):
- Üretici org, kendi ilişkisi olmayan bir siparişi göremez.
- Perakendeci org, başka perakendecinin `retail_prices` satırını göremez.
- Misafir org, sponsoruyla arasındaki `relationships` `passive` olduğunda o ilişkinin verisini göremez.

**Fiyat izolasyonu** — `src/test/price-isolation.test.ts`: her rol için gizli tabloların 0 satır dönmesi + `order_items` / `products` kolon listesinde yasak kolonun bulunmaması (şema assertion'ı).

**Giriş akışları** — `e2e/auth.spec.ts` (Playwright), 7 senaryo:
1. Açılışta hiçbir input görünmüyor, sadece 3 buton.
2. Abone üretici: kendi VKN + şifre → `/m` .
3. Misafir üretici: sponsor perakendeci VKN + kendi VKN + şifre → misafir paneli.
4. Abone perakendeci: kendi VKN + şifre → `/app`.
5. Misafir perakendeci: sponsor üretici VKN + kendi VKN + şifre.
6. Yanlış sponsor VKN → giriş reddedilir.
7. Admin, `admincyo` dışındaki subdomain'den giremez.

**Yükseltme** — `e2e/upgrade.spec.ts`: misafir perakendeciye sipariş + cari hareket yazılır → admin tek tıkla aboneye yükseltir → aynı kullanıcı kendi VKN'siyle (sponsor VKN'si olmadan) girer ve **aynı sipariş/cari geçmişini** görür.

**Ekosistem** — `e2e/relationship.spec.ts`: abone A, henüz sistemde olmayan bir VKN ekler → misafir org açılır; sonra o VKN abone olur; abone B aynı VKN'yi eklemeye çalışınca **yeni org açılmaz**, mevcut düğüme `pending` kenar düşer ve onaylanır.

**Seed** — `scripts/seed.mjs`: 1 platform admin, 2 abone üretici, 2 abone perakendeci, 2 misafir (her taraftan bir tane), aralarında 5 ilişki, örnek ürün/sipariş/cari. Yukarıdaki tüm e2e senaryolarının veri tabanı.

---

## 12. Mimari kararlar (ADR — kilitli)

Bunlar tartışması bitmiş, kodun üzerine inşa edileceği kararlardır. Değişmesi gerekirse önce bu liste güncellenir.

| # | Karar | Gerekçe / Reddedilen alternatif |
|---|---|---|
| **A1** | Tenant birimi **ilişkidir** (`relationships`), taraf değil. | İki eski projenin de "tenant benim" varsayımı köprüyü doğurmuştu. Reddedilen: iki tenant tipini `tenant_type` kolonuyla ayırmak — her sorguda dallanma ve iki ayrı RLS ağacı demek. |
| **A2** | Misafir = `organizations.is_subscriber=false`. Ayrı tablo, `is_shadow` bayrağı veya ayna kayıt **yok**. | Yükseltmeyi veri taşımasız hale getirir. Reddedilen: köprü planındaki `users.is_shadow` yaklaşımı. |
| **A3** | `organizations.vkn_tc` **UNIQUE NOT NULL**, checksum doğrulamalı. Hem giriş kimliği hem yakınsama anahtarı. | Köprünün "önce VKN, sonra e-posta, yoksa hayalet aç" heuristiğini gereksiz kılar. İki eski projede de bu alan doğrulanmamış serbest metindi. |
| **A4** | Gizli fiyatlar **ayrı tablolarda** (`product_costs`, `retail_prices`, `order_item_retail_prices`). | Postgres RLS satır düzeyindedir; kolon düzeyinde koruma kırılgandır. Reddedilen: `GRANT SELECT (col)` kolon yetkisi ve "view üzerinden gizle" — ikisinde de `select('*')` ile sızma yolu kalır. |
| **A5** | Cari (`transactions`) **yalnızca** `supplier_unit_price` bazlıdır. | Üç fiyattan iki tarafın da gördüğü tek katman budur. |
| **A6** | Giriş tek Edge Function'da (`login`), service-role ile. İstemci `users` tablosunda arama yapmaz. | Kullanıcı numaralandırma açığını kapatır, misafirin sponsor-VKN kontrolünü ve kilitlenme sayacını sunucuya taşır. Reddedilen: furniture-platform'un istemci tarafı `user_code` araması. |
| **A7** | `password_hash` kolonu **hiç yok**; şifre tek yol `update-user-password` Edge Function. | furniture-platform'daki düz metin şifre + çift hash tehlikesini baştan siler. |
| **A8** | Ledger değişmez: kök siparişin ilk `debit` kaydına UPDATE/DELETE yok; her düzeltme yeni INSERT. | Her iki eski projenin de ortak kilitli kuralı; muhasebe denetlenebilirliği. |
| **A9** | Her RPC **tek imzalı**; imza değişimi `DROP → CREATE → NOTIFY pgrst`. | PostgREST `409 ambiguous call` hatası. |
| **A10** | Rol JWT'den değil `public.users` + `organizations`'dan okunur; RLS `SECURITY DEFINER STABLE` helper'lar üzerinden. | RLS sonsuz özyineleme hatasını önler; her iki eski projede de kanıtlanmış desen. |
| **A11** | Sunucu durumu **yalnızca** react-query'de; Zustand yalnız sepet/UI. `App.tsx` yalnız router. | furniture-platform'un 1700 satırlık god component'inin tekrarını engeller. |
| **A12** | Şema değişikliği **yalnızca migration**; elle SQL yasak. `supabase db reset` ile sıfır ortam ayağa kalkmalı. | furniture-platform'da repo canlı DB'yi yansıtmıyordu (`initial_schema.sql` başlığında "production'a uygulanmamalıdır" yazıyor) — bu drift bir daha oluşmamalı. |
| **A13** | Soft delete varsayılan (`is_active=false`); gerçek DELETE yalnız admin cascade RPC'si ile. | Cari ve sipariş geçmişinin bütünlüğü. |
| **A14** | Plan gating **çift katman**: frontend + RLS/Edge. | Yalnız frontend gate bypass edilebilir. |
| **A15** | Aynı `kind`'a sahip iki org arasında ilişki kurulamaz (CHECK + RPC kontrolü). | Üretici–üretici / perakendeci–perakendeci kenarı iş anlamında yok. |
| **A16** | RLS anahtarı **denormalize `manufacturer_org_id` + `retailer_org_id`**; `relationship_id` yalnız join/config için. | 5k üretici × 50k perakendeci ölçeğinde `IN (SELECT ...)` küme materyalizasyonu kabul edilemez. Bkz. §2.3. |
| **A17** | Liste sorgularında **keyset (cursor) pagination**; `OFFSET` yasak. Kolon listesi **açıkça yazılır**, `select('*')` yasak. | `OFFSET 10000` her sayfada 10k satır tarar. Açık kolon listesi aynı zamanda A4'ün ikinci savunma hattıdır. |
| **A18** | Cari bakiye her `transactions` satırında **`balance_after`** olarak taşınır; bakiye `SUM()` ile hesaplanmaz. | Milyonlarca satırda `SUM()` her ekran açılışında tam tarama demek. Değişmezlik (A8) korunur — `balance_after` da yalnız INSERT'te yazılır. |
| **A19** | **Dosya bütçesi zorunlu:** component ≤200, page ≤150, api/hook ≤150, domain ≤200 satır. Aşan dosya hook tarafından **bloklanır**. | furniture-platform'un 1700 satırlık `App.tsx`'i ve 90–99 KB'lık sayfaları bu kural olmadığı için oluştu. |
| **A20** | **Katman ve modül sınırı:** Supabase çağrısı yalnız `features/*/api`'de · `domain/` saf (React/Supabase yok) · `pages/` yalnız kompozisyon · feature'lar birbirini yalnız `index.ts` public yüzeyinden görür. ESLint `no-restricted-imports` + hook ile zorlanır. | Kod yığınları katman sızıntısıyla başlar; sınır makine tarafından denetlenmezse erozyona uğrar. |

---

## 13. Harness — skill, plugin (MCP), hook, agent

`retailer-platform SAAS/.claude/` altındaki kurulum olgun ve bu projede kanıtlanmış. **Sıfırdan yazılmaz; kopyalanıp org modeline uyarlanır.**

### 13.1 Skills (`.claude/skills/<ad>/SKILL.md`)

Taşınacak 6 skill (retailer-platform'dan, uyarlanarak):

| Skill | Uyarlama |
|---|---|
| `new-migration` | RLS şablonu `get_my_retailer_id()` yerine `my_relationship_ids()` / `get_my_org_id()` |
| `new-rpc` | Atomik RPC tablosu yeni org modeline göre; `relationship_id` parametreleri |
| `new-edge-function` | `_shared/cors.ts` + `_shared/auth.ts` aynı; `login` fonksiyonu da tek yetkili giriş yolu olarak listelenir |
| `new-feature` | `src/features/<ad>/{api,domain,components}` deseni aynen |
| `gen-types` | Aynen |
| `verify-rls` | Kontrol listesine **fiyat izolasyonu** maddeleri eklenir |

Yeni eklenecek 2 skill (bu projeye özgü):

| Skill | Ne yapar |
|---|---|
| **`verify-price-isolation`** | Üç fiyat katmanının sızmadığını doğrular: `products`/`order_items` kolon listesinde yasak kolon var mı, üretici oturumu `retail_prices` görüyor mu, perakendeci `product_costs` görüyor mu. `src/test/price-isolation.test.ts` çalıştırır. **A4'ün otomatik bekçisi.** |
| **`port-from-legacy`** | İki eski projeden özellik taşırken izlenecek disiplin: kaynak dosyayı bul → org modeline çevrilecek alanları listele (`retailer_id`/`manufacturer_id` → `relationship_id`/`org_id`) → köprü kalıntısı var mı kontrol et → onay al → taşı. |

### 13.2 Plugin / MCP sunucuları (`.mcp.json`)

Aynı 5 sunucu: `supabase` (read-only, yeni project-ref), `playwright`, `context7`, `chrome-devtools`, `github`.

> ⚠️ **Güvenlik — hemen aksiyon gerekiyor.** Mevcut `retailer-platform SAAS/.mcp.json` dosyasında **canlı sırlar açık yazılı**: `SUPABASE_ACCESS_TOKEN` (`sbp_3a9aa...`) ve `GITHUB_PERSONAL_ACCESS_TOKEN` (`ghp_iQbZ...`). Aynı klasördeki `.claude/README.md` "Sırlar `.mcp.json`'a yazılmaz (env interpolation)" diyor — kural yazılmış ama uygulanmamış. Ayrıca `furniture-platform/.env.local` de commit'lenmiş sırlar içeriyor.
> **Yapılacak:** (1) her iki token da **iptal edilip yenilenir**, (2) yeni projede `.mcp.json` yalnızca `${SUPABASE_ACCESS_TOKEN}` gibi env interpolation kullanır, (3) `.gitignore`'a `.mcp.json` değil `.env*` girer ve `.mcp.json` sırsız commit'lenir.

### 13.3 Hook'lar (`.claude/hooks/*.mjs` — sert blok = exit 2)

Mevcut 6 hook taşınır, kural numaraları yeni CLAUDE.md'ye göre güncellenir:

| Hook | Olay | Ne bloklar |
|---|---|---|
| `guard-bash` | PreToolUse(Bash) | Elle SQL / `psql` / migration'sız `db push` / izinsiz `git push` / yıkıcı komut |
| `guard-write` | PreToolUse(Write\|Edit) | İkinci constants dosyası · `App.tsx`'e iş mantığı · store'a sunucu verisi · `password_hash` · migration'da düz `auth.uid()` / `security_invoker` eksik / `search_path` eksik |
| `lint-changed` | PostToolUse | Değişen TS'te ESLint (araç yoksa sessiz) |
| `rpc-reload-reminder` | PostToolUse | RPC migration'ında DROP→CREATE→NOTIFY hatırlatması |
| `inject-plan-reminder` | UserPromptSubmit | Kod promptlarına PLAN + kilitli kural bağlamı enjekte |
| `final-gate` | Stop | Tur sonu lint/test hatırlatması |

**Yeni eklenecek 2 hook:**

| Hook | Ne bloklar |
|---|---|
| **`guard-price-leak`** | PreToolUse(Write\|Edit). Migration'da `products` tablosuna `cost_price`, `order_items` tablosuna `retail_unit_price` kolonu eklenmesini; TS'te `products` sorgusunda `cost_price` seçilmesini **bloklar**. A4'ün kod seviyesindeki bekçisi. |
| **`guard-bridge-residue`** | PreToolUse(Write\|Edit). `bridge_`, `is_shadow`, `pairing_code`, `outbound_secret`, `X-Bridge-Signature`, `integrationBridge` geçen yeni kod yazımını bloklar — köprü kavramı geri sızmasın. |

### 13.4 Subagent'lar (`.claude/agents/*.md`)

Üç tane; hepsi read-only + rapor, kod yazmaz:

| Agent | Görev | Ne zaman |
|---|---|---|
| **`rls-auditor`** | Tüm RLS politikalarını + fiyat izolasyonunu denetler, Supabase MCP `get_advisors` çalıştırır, açıkları önem sırasıyla raporlar. | Her şema/politika değişikliğinden sonra, faz sonlarında |
| **`legacy-scout`** | İki eski projede belirli bir özelliğin nerede/nasıl yapıldığını bulur, org modeline çevrilmesi gereken alanları listeler. Kod taşımaz, harita çıkarır. | Faz 7-8 port işlerinde |
| **`schema-reviewer`** | Yeni migration'ı A1–A15 kararlarına karşı denetler: RLS açık mı, helper kullanılmış mı, index var mı, soft delete mi, yasak kolon var mı. | Her migration PR'ında |

> `furniture-platform/AGENTS.md`'deki çalışma döngüsü korunur: **Tespit → Açıkla → Onay Al → Uygula → Rapor Ver**, açıklamalar Türkçe.

### 13.5 Slash komutları

`furniture-platform/COMMANDS.md`'den taşınır ve sadeleştirilir: `/audit`, `/fix`, `/write-tests`, `/check-rls`, `/status`. `/split` alınmaz (god component yok, olmayacak).

---

## 14. `KÖPRÜ/CLAUDE.md` — Faz 0'da yazılacak tam metin

```markdown
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
npm run build        # Production build
npm run lint         # tsc --noEmit + ESLint
npm test             # Vitest
npm run test:e2e     # Playwright
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
8. **Cari yetkisi.** Cari revize/masraf/ödeme perakendeci veya accountant tarafından
   yapılır; üretici cariyi yalnızca izler (SELECT).
9. **İlişki kapsamı.** Her org yalnız kendi `relationships` kenarlarının verisini görür
   (`my_relationship_ids()`). Aynı `kind`'a sahip iki org arasında ilişki kurulamaz.
10. **`App.tsx` yalnız router.** İş mantığı/state/veri çekme buraya yazılmaz.
11. **Tek `src/constants/index.ts`.** Başka constants dosyası açılmaz.
12. **Sunucu durumu react-query'de.** Zustand'da sunucu verisi tutulmaz.
13. **TS strict + ESLint zorunlu.** DB tipleri `npm run gen:types` ile üretilir;
    elle tip veya elle case-conversion katmanı yazılmaz.
14. **Stok** yazımı `update-stock` Edge Function (service role) ile; istemci doğrudan yazmaz.
15. **Plan gating çift katman:** frontend + RLS/Edge.
16. **Soft delete varsayılan** (`is_active=false`). Gerçek DELETE yalnız admin'in
    cascade RPC'si ile ve yalnız pasifleştirilmiş kayıtlar için.
17. **`system_logs`** 90 gün retention. **Storage** bucket'ları private; public listing kapalı.
18. **VKN/TCKN** `organizations.vkn_tc` UNIQUE NOT NULL; `src/lib/tckn.ts` checksum
    doğrulaması hem formda hem DB CHECK'te uygulanır.

## Çalışma Döngüsü

**Tespit → Açıkla → Onay Al → Uygula → Rapor Ver.**

- Her değişiklikten önce dokunulacak dosyaları listele, etkilenen component/prop/politikaları
  göster, onay al, sonra uygula.
- Anlamadığını tahmin etme, sor. Kapsam dışına çıkma.
- Açıklamalar Türkçe.

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
  features/     <ad>/{api,domain,components}  — tek desen
  pages/        auth/ admin/ manufacturer/ retailer/ shared/
  components/ui/
  constants/index.ts        # TEK constants dosyası
  lib/          supabase.ts, planGating.ts, tckn.ts, format.ts
  types/        index.ts, database.generated.ts
supabase/
  migrations/   *.sql
  functions/    _shared/, login, update-user-password, update-stock, ...
```
```

---

## 15. Hata yönetim protokolü — `.claude/ERROR_PROTOCOLS.md`

retailer-platform'daki 11 maddelik protokol taşınır (hepsi bu projede de geçerli):
409 ambiguous RPC · PGRST202 bayat şema cache · RLS sonsuz özyineleme · migration drift ·
bayat TS tipleri · `auth_rls_initplan` performans uyarısı · Edge Function CORS ·
Storage 403 · plan gating bypass · şifre yazma reddi · ledger testi kırmızı.

Bu projeye özgü **5 yeni madde** eklenir:

| # | Hata | Sebep | Çözüm |
|---|---|---|---|
| **12** | `login` → `403 NO_ACTIVE_RELATIONSHIP` | Misafir, sponsor VKN'si ile arasında `status='active'` ilişki olmadan giriyor | `relationships` satırını kontrol et; `pending` ise karşı taraf onaylamamış, `passive` ise abone bağlantıyı kesmiş. Elle `active` yapma — `add_counterparty` / onay akışını kullan. |
| **13** | Fiyat sızıntısı — `price-isolation.test.ts` kırmızı | Gizli kolon ana tabloya eklenmiş veya snapshot spread ile üretilmiş | Kolonu ayrı tabloya taşı (A4). Snapshot'ı `src/features/orders/domain/snapshot.ts` allowlist serializer'ına çevir. `guard-price-leak` hook'unu atlatma. |
| **14** | `23505 duplicate key` — `organizations.vkn_tc` | Aynı VKN ile ikinci org açılmaya çalışılıyor | Doğru davranış budur — yakınsama noktası. `add_counterparty` RPC'si önce mevcut org'u aramalı, bulursa yeni kenar açmalı. Yeni org INSERT etme. |
| **15** | Yükseltme sonrası kullanıcı eski verisini görmüyor | `upgrade_org_to_subscriber` ilişkileri bozmuş veya yeni org açmış | RPC hiçbir `relationships` satırına dokunmamalı, yeni `organizations` satırı açmamalı. Yalnız flag + plan + subdomain + owner kullanıcı. `e2e/upgrade.spec.ts` bunu korur. |
| **16** | Üretici↔üretici ilişki hatası | `add_counterparty` aynı `kind` ile çağrılmış | CHECK constraint doğru çalışıyor (A15). Çağıran tarafın `kind`'ının tersini hedefle. |

**Hata yönetimi çalışma protokolü** (kod yazarken):
1. Hata alındığında **önce `ERROR_PROTOCOLS.md`'ye bak** — tahmin etme.
2. Listede yoksa: kök sebebi bul, çözümü uygula, **maddeyi listeye ekle**. Protokol dosyası canlı belgedir.
3. Hook bir yazımı bloklarsa: hook'u devre dışı bırakma, kuralı uygula. Kural gerçekten yanlışsa önce §12'deki ADR'yi tartış.
4. RLS/fiyat ile ilgili her hatadan sonra `verify-rls` + `verify-price-isolation` skill'lerini çalıştır.
5. Üretim hatası: `system_logs` + Supabase log'u → tekrar üreten bir test yaz → düzelt → test yeşil.

---

## 16. "Detaylı bir çalışma yapmalı mıyız?" — evet, ama sınırlı yerde

Bu proje, **iki çalışan sistemin yerine geçecek** ve tek veritabanında rakip firmaların ticari verisini yan yana tutacak. Detaylı çalışmayı hak eden üç konu var; gerisi doğrudan uygulanabilir:

1. **Fiyat izolasyonu (A4)** — en yüksek risk. Köprüde bu koruma "alanı göndermemek"ti; tek DB'de kaybolur. Yanlış yaparsak üretici perakendecinin kâr marjını, perakendeci üreticinin maliyetini görür. **Faz 2 tamamlanmadan Faz 6'ya (sipariş) geçilmemeli** ve `price-isolation.test.ts` yazılmadan hiçbir fiyat kolonu eklenmemeli.
2. **RLS politika ağacı (A1 + A10)** — tenant "ilişki" olduğu için politikalar iki eski projeden daha karmaşık. `my_relationship_ids()` fonksiyonunun indexlenmesi ve `STABLE` işaretlenmesi performans için kritik. Faz 1'de tam RLS test paketi yazılmalı.
3. **Yükseltme akışı (§5)** — ürünün ticari vaadi bu. Misafirin sipariş/cari geçmişinin yükseltme sonrası **aynen** durduğu e2e testle kanıtlanmalı.

Detaylı çalışma **gerektirmeyenler**: UI bileşenleri, modül port'ları, kampanya/AI/Lead modülleri — bunların deseni iki eski projede zaten çözülmüş, doğrudan taşınır.

**Önerilen ilk adım:** Faz 0 + Faz 1 + Faz 2 tek blok halinde yapılsın (iskele + org şeması + fiyat katmanı + test paketi). Bu blok bittiğinde mimarinin doğru olduğu kanıtlanmış olur; kalan fazlar mekanik ilerler.

---

## 17. Ölçek — 5.000 üretici × 50.000 perakendeci

Hedef büyüklük: ~5k üretici, ~50k perakendeci, ~500k ilişki kenarı, yılda ~5M sipariş / ~20M sipariş satırı. Postgres için orta ölçek — ama **her tasarım kararı index dostu olmak zorunda.**

### 17.1 Veritabanı

| Konu | Karar |
|---|---|
| **RLS sıcak yolu** | Denormalize `manufacturer_org_id` / `retailer_org_id` üzerinde eşitlik (A16). Küme üyeliği (`IN`) yok. |
| **Index seti** | Her işlem tablosunda `(manufacturer_org_id, created_at DESC, id DESC)` ve `(retailer_org_id, created_at DESC, id DESC)` bileşik index — hem RLS hem keyset pagination aynı index'i kullanır. |
| **Pagination** | Keyset: `WHERE (created_at, id) < ($cursor_ts, $cursor_id) ORDER BY created_at DESC, id DESC LIMIT n`. `OFFSET` yasak (A17). |
| **Cari bakiye** | `transactions.balance_after` running balance (A18). Güncel bakiye = ilişkinin en son satırı → tek index lookup. Atomik RPC içinde `FOR UPDATE` ile satır kilidi. |
| **Log tabloları** | `system_logs`, `order_status_logs` → `created_at` ile **aylık partition** (`PARTITION BY RANGE`). 90 gün retention job'ı eski partition'ı `DROP` eder (DELETE değil). |
| **Arama** | `organizations.company_name` → `pg_trgm` GIN index; `vkn_tc` → unique btree. Admin'in 55k org listesi sunucu tarafı sayfalı + indexli arama. |
| **Katalog** | `products (owner_org_id, is_active)` + ad/kod için trigram. Ürün listesi asla tam tablo taramaz. |
| **Sayaçlar** | Dashboard KPI'ları `COUNT(*)` ile hesaplanmaz; `org_stats` özet tablosu atomik RPC'ler içinde artırılır. |
| **Realtime** | Her org yalnız kendi filtreli kanalına abone olur (`filter: retailer_org_id=eq.<id>`). Global tablo aboneliği yasak — 50k istemci × tablo yayını sunucuyu düşürür. Payload değil, `queryClient.invalidateQueries` tetikleyicisi olarak kullanılır. |
| **Connection** | PostgREST + Supabase pooler (transaction mode). Uzun süren rapor sorguları ayrı, read-replica'ya taşınabilir olacak şekilde `features/reports/api` içinde izole. |

### 17.2 Frontend

- **Liste sanallaştırma** yok — keyset pagination + "daha fazla yükle" yeterli; sonsuz DOM büyümesi olmaz.
- **react-query** `staleTime` her sorgu tipinde açıkça belirlenir; katalog uzun, sipariş kısa. Global default'a bırakılmaz.
- **Kod bölme:** rota bazlı `React.lazy` — admin, üretici ve perakendeci panelleri ayrı chunk. `manualChunks` ile vendor ayrımı (vite.config).
- **Bundle bütçesi:** ilk yükleme ≤ 250 KB gzip. `npm run build` sonrası kontrol edilir.

---

## 18. Kod disiplini — "kod yığını" oluşmasını makine engeller

furniture-platform'daki 1700 satırlık `App.tsx`, 99 KB `OrderHistoryPage.tsx` ve 90 KB `LoginPage.tsx` kaza değil: **kural yazılmıştı ama denetlenmiyordu.** Bu projede sınırları hook ve ESLint zorlar; yorumla değil.

### 18.1 Dosya bütçesi (A19) — `guard-file-size` hook'u bloklar

| Dosya tipi | Üst sınır | Aşarsa |
|---|---|---|
| `components/**/*.tsx` | 200 satır | BLOK — alt bileşene böl |
| `pages/**/*.tsx` | 150 satır | BLOK — sayfa yalnız kompozisyon |
| `features/*/api/*.ts` | 150 satır | BLOK — sorgu başına dosya |
| `features/*/domain/*.ts` | 200 satır | BLOK — sorumluluk başına dosya |
| `supabase/migrations/*.sql` | sınır yok | — |

### 18.2 Katman kuralları (A20) — `guard-layers` hook'u + ESLint bloklar

```
pages/          → yalnız kompozisyon. supabase import YASAK, useQuery YASAK, iş mantığı YASAK.
features/*/api  → Supabase'e dokunan TEK yer. react-query hook'ları burada.
features/*/domain → SAF. react, @supabase, DOM import YASAK. %90 test kapsamı.
features/*/components → sunum + form. Doğrudan supabase çağrısı YASAK.
components/ui   → presentational. Veri çekmez, feature import etmez.
lib/            → yardımcı. features/ import etmez.
app/            → router, guard, provider. İş mantığı YASAK.
```

**Modül sınırı:** bir feature başka bir feature'ın iç dosyasını import edemez — yalnız `features/<ad>/index.ts` public yüzeyi. ESLint:

```js
'no-restricted-imports': ['error', { patterns: [
  { group: ['@/features/*/api/*', '@/features/*/domain/*', '@/features/*/components/*'],
    message: 'Feature içine doğrudan import yasak (A20). features/<ad> public yüzeyini kullan.' },
  { group: ['@/features/*'], importNames: ['*'],
    message: 'Yıldız import yasak; adlandırılmış export kullan.' },
]}]
```

### 18.3 Bir feature nasıl görünür

```
src/features/orders/
  api/
    useOrderList.ts        # keyset sorgu + react-query
    useOrderDetail.ts
    useOrderMutations.ts   # atomik RPC çağrıları
    columns.ts             # açık kolon listeleri (A17 + A4)
  domain/
    status.ts              # durum geçiş kuralları — saf
    remaining.ts           # kısmi sevkiyat kalan adet — saf
    snapshot.ts            # allowlist serializer (A4)
    *.test.ts              # her domain dosyasının testi
  components/
    OrderList.tsx
    OrderRow.tsx
    OrderStatusBadge.tsx
  index.ts                 # public yüzey — dışarıya SADECE bu
```

### 18.4 Ek hook'lar

| Hook | Ne bloklar |
|---|---|
| **`guard-file-size`** | §18.1 bütçesini aşan yazımlar |
| **`guard-layers`** | Katman ihlalleri: `pages/`'de supabase/useQuery, `domain/`'de react/supabase import, `components/ui`'de feature import |
| **`guard-query-shape`** | `.select('*')` kullanımı ve `.range(`/`offset` ile sayfalama (A17) |

Bu üçü, §13.3'teki `guard-price-leak` ve `guard-bridge-residue` ile birlikte **5 yeni hook** eder; toplam 11 hook.
