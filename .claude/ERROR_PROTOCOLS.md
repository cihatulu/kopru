# ERROR_PROTOCOLS.md — KÖPRÜ

Projeye özgü sık hatalar ve **kesin çözüm adımları**. Şüphede önce buraya bak, tahmin etme.

**Bu dosya canlı belgedir.** Listede olmayan bir hatayı çözdüğünde maddeyi buraya ekle.

---

### 1. PostgREST 409 — "ambiguous function" / "could not choose best candidate"
**Sebep:** Aynı isimde birden çok RPC overload var (kilitli kural 6 ihlali).
**Çözüm:**
1. Eski imzayı tam tip listesiyle kaldır: `drop function if exists public.fn_name(uuid, jsonb);`
2. Tek imzalı `create or replace function ...` ile yeniden tanımla.
3. `notify pgrst, 'reload schema';`
Kontrol: `select proname, pronargs from pg_proc where proname = '<ad>';` — tek satır dönmeli.

### 2. PGRST202 — RPC bulunamadı / değişiklik görünmüyor
**Sebep:** PostgREST şema cache'i bayat.
**Çözüm:** SQL Editor'de `notify pgrst, 'reload schema';`. Lokalde `npm run db:reset`.

### 3. RLS "infinite recursion detected in policy for relation ..."
**Sebep:** Politika `using`/`with check` içinde aynı tabloyu (çoğunlukla `users`) sorguluyor.
**Çözüm:** Sorguyu `SECURITY DEFINER STABLE` helper'a taşı: `get_my_user_id()`, `get_my_org_id()`,
`get_my_org_kind()`, `is_platform_admin()` (hepsi `SET search_path = public`). Politika helper'ı çağırır.

### 4. Migration drift — "remote/local schema differs"
**Sebep:** DB elle değiştirilmiş (kilitli kural 1 ihlali) veya migration uygulanmamış.
**Çözüm:** `npm run db:diff` ile farkı al → `supabase migration new <ad>` ile dosyaya çevir →
`npm run db:reset` ile sıfır ortamda doğrula. Elle SQL'i kalıcılaştırma.

### 5. TS hatası — "Property does not exist on type" / tipler eski
**Sebep:** `database.generated.ts` şemayla senkron değil.
**Çözüm:** `npm run gen:types`. Elle tip veya elle case-conversion katmanı yazma (kural 13).

### 6. Supabase performans uyarısı — "auth_rls_initplan"
**Sebep:** Politikada düz `auth.uid()`.
**Çözüm:** `(select auth.uid())` ile sar (kural 4). `guard-write` hook'u zaten bunu bloklar.

### 7. Edge Function — CORS hatası / preflight başarısız
**Sebep:** `OPTIONS` handler veya CORS başlıkları eksik.
**Çözüm:** `_shared/cors.ts` başlıklarını ekle; fonksiyon başında
`if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });`

### 8. Storage — 403 / erişim reddi
**Sebep:** Bucket private (olması gereken) ama klasör-bazlı RLS politikası yok.
**Çözüm:** Bucket private kalır (kural 17); `storage.objects` politikasını ekle — org kendi
`<org_id>/` klasörüne yazar.

### 9. Plan gating bypass — kısıtlı modüle erişim
**Sebep:** Yalnız frontend gate var; sunucu açık.
**Çözüm:** Çift katman (kural 15): frontend gate + RLS/Edge'de `organizations.plan` kontrolü.

### 10. Şifre yazma reddi / hook blok
**Sebep:** Frontend'den doğrudan şifre yazılmaya çalışılıyor (kural 2).
**Çözüm:** Tüm şifre işlemleri `update-user-password` Edge Function (`auth.admin.*`).
`password_hash` kolonu bu projede yoktur.

### 11. Ledger testi kırmızı — "ilk debit değişti"
**Sebep:** Kök siparişin ilk `debit` transaction'ına UPDATE/DELETE yapılmış (kural 7).
**Çözüm:** Değişikliği geri al; iptal/iade/ödemeyi **yeni INSERT** (dengeleyici credit/debit)
ile yap. Atomik RPC içinde tek transaction.

---

## KÖPRÜ'ye özgü

### 12. `login` → `403 NO_ACTIVE_RELATIONSHIP`
**Sebep:** Misafir org, verdiği sponsor VKN'si ile arasında `status='active'` ilişki olmadan giriyor.
**Çözüm:** `relationships` satırını kontrol et — `pending` ise karşı taraf (abone) henüz
onaylamamış, `passive` ise abone bağlantıyı kesmiş. **Elle `active` yapma;**
`add_counterparty` / onay akışını kullan.

### 13. Fiyat sızıntısı — `price-isolation.test.ts` kırmızı
**Sebep:** Gizli kolon ana tabloya eklenmiş veya snapshot spread ile üretilmiş.
**Çözüm:** Kolonu ayrı tabloya taşı (A4: `product_costs` / `retail_prices` /
`order_item_retail_prices`). Snapshot'ı `features/orders/domain/snapshot.ts` allowlist
serializer'ına çevir. `guard-write`'ın fiyat kontrolünü atlatma.

### 14. `23505 duplicate key` — `organizations.vkn_tc`
**Sebep:** Aynı VKN ile ikinci org açılmaya çalışılıyor.
**Çözüm:** **Bu doğru davranıştır** — VKN yakınsama noktasıdır. `add_counterparty` önce
mevcut org'u aramalı, bulursa yeni `relationships` kenarı açmalı. Yeni `organizations`
satırı INSERT etme; köprü çağındaki "hayalet kayıt" mantığı geri gelmez.

### 15. Yükseltme sonrası kullanıcı eski verisini görmüyor
**Sebep:** `upgrade_org_to_subscriber` ilişkileri bozmuş veya yeni org açmış.
**Çözüm:** RPC hiçbir `relationships` satırına dokunmaz, yeni `organizations` satırı açmaz.
Yalnız `is_subscriber` + plan + subdomain + owner kullanıcı. `e2e/upgrade.spec.ts` bunu korur.

### 16. Üretici↔üretici ilişki hatası
**Sebep:** `add_counterparty` aynı `kind` ile çağrılmış.
**Çözüm:** CHECK constraint doğru çalışıyor (A15). Çağıran org'un `kind`'ının **tersini** hedefle.

### 17. Liste sorgusu yavaş / timeout
**Sebep:** RLS `relationship_id IN (SELECT ...)` deseni, `OFFSET` sayfalama veya eksik index.
**Çözüm:** (a) Politikayı denormalize `manufacturer_org_id`/`retailer_org_id` eşitliğine çevir (A16).
(b) Keyset pagination'a geç (A17). (c) `(org_id, created_at DESC, id DESC)` bileşik index'i doğrula:
`explain analyze` çıktısında `Index Scan` görmelisin, `Seq Scan` değil.
5.000 üretici × 50.000 perakendeci ölçeğinde `Seq Scan` kabul edilemez.

### 18. Cari bakiye tutmuyor / bakiye sorgusu yavaş
**Sebep:** Bakiye `SUM(debit) - SUM(credit)` ile hesaplanıyor (A18 ihlali) veya eşzamanlı
iki INSERT `balance_after` değerini yarıştırmış.
**Çözüm:** Bakiye = ilişkinin **son** `transactions` satırındaki `balance_after`.
Yeni satır atomik RPC içinde, önceki satır `FOR UPDATE` ile kilitlenerek yazılır.

### 19. Hook blok etti — "dosya bütçesi aşıldı"
**Sebep:** Dosya A19 sınırını geçti.
**Çözüm:** Böl. Sayfa ise alt bileşen çıkar; api ise sorgu başına dosya aç; component ise
saf mantığı `domain/`'e taşı. **Sınırı yükseltme** — bütçe tam olarak bunu engellemek için var.

### 20. Hook blok etti — "katman ihlali"
**Sebep:** `pages/`'de Supabase/useQuery, `domain/`'de react/supabase import'u veya çapraz
feature iç import'u (A20).
**Çözüm:** Veri erişimini `features/<ad>/api`'ye taşı; saf mantığı `domain/`'de bağımlılıksız
tut; başka feature'a erişimi `@/features/<ad>` public yüzeyinden yap.

### 21. `Could not find a relationship between '<tablo>' and '<kolon>' in the schema cache`
**Sebep:** PostgREST gömme (embed) ipucu **kolon adıyla** verilmiş, ama o yabancı anahtar
A15 gereği **bileşik**: `(org_id, kind) → organizations(id, kind)`. PostgREST bileşik bir
kısıtı tek kolonluk ipuçtan çözemez. Hata sessizdir: `tsc` ve ESLint geçer, test yeşil kalır,
liste canlıda **tamamen boş** görünür. `relationships` ve `announcements` sorgularında yaşandı.
**Çözüm:** İpucunu **kısıt adıyla** ver:
`retailer:organizations!relationships_retailer_org_id_retailer_kind_fkey(...)`.
Kısıt adı `<tablo>_<kolon>_<kind_kolonu>_fkey` kalıbındadır. Yeni bir gömme yazdığında
şema cache'ine güvenme — sorguyu canlıda bir kez çalıştırıp satır döndüğünü gör.

### 22. `function gen_random_bytes(integer) does not exist`
**Sebep:** `gen_random_bytes` pgcrypto'ya aittir ve Supabase pgcrypto'yu `extensions`
şemasına kurar. Fonksiyon `set search_path = public` ile çalıştığı için (kilitli kural 4)
o şema görünmez. `create extension if not exists pgcrypto` bunu **düzeltmez** — eklenti
zaten kurulu olduğundan ifade sessizce hiçbir şey yapmaz.
**Çözüm:** `extensions.` ile nitelemek yerine bağımlılığı kaldır. Rastgele değer gerekiyorsa
`gen_random_uuid()` kullan — PostgreSQL 13+ çekirdeğindedir (`pg_catalog`), search_path ne
olursa olsun görünür. Token için: `replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')`.

### 23. `INSERT has more target columns than expressions`
**Sebep:** RPC içindeki `insert ... select` ifadesinde hedef kolon sayısı, SELECT'in
ürettiği kolon sayısıyla uyuşmuyor. `set_staff_scope`'ta yaşandı: iki kolona yazılıyor
ama SELECT tek kolon üretiyordu; personel kapsamı hiçbir zaman kaydedilemiyordu.
**Çözüm:** Sabit değeri de SELECT listesine yaz (`select p_staff_user_id, r.retailer_org_id ...`).

**Bu hatanın asıl dersi testlerle ilgili:** fonksiyon gövdesini metin olarak denetleyen
şema testleri bunu YAKALAYAMAZ — SQL sözdizimsel olarak dosyada duruyordu, yalnız
çalışma anında patlıyordu. Yeni bir RPC yazdığında şema testine ek olarak **canlıda bir
kez çağır**; dönen hatayı görmeden "yazıldı" sayma.

### 24. Personel giriş ekranını geçemiyor
**Sebep:** `login` Edge Function gelen kullanıcı kodunu `[\s.-]` ayraçlarından temizler
(VKN'yi "123-456 7890" diye yazan kullanıcı için). Personel koduna tire konursa
normalize edildikten sonra `users.user_code` ile **hiçbir zaman** eşleşmez. Ayrıca
istemcideki `loginSchema` yalnız 10/11 haneli VKN/TCKN kabul ediyorsa personel kodu
forma bile girilemez.
**Çözüm:** Personel kodu tümüyle rakamdır: `<vkn><iki haneli sıra>`. İstemci şeması
`isValidVknTc(v) || isStaffCode(v)` ile her ikisini kabul eder.

### 25. Cari özet gerçek bakiyenin İKİ KATINI gösteriyor
**Sebep:** Dönem özetinde açılış bakiyesi koşulu `(p_from is null or created_at < p_from)`
biçimindeydi. `p_from` null olduğunda bu koşul **tüm** satırlar için doğru olur ve sorgu
SON hareketin `balance_after` değerini "açılış" diye döndürür; kapanış
`açılış + borç − alacak` ile hesaplanınca aynı hareketler ikinci kez eklenir.
**Çözüm:** Alt sınır yoksa "dönemden önce" diye bir şey yoktur — açılış **sıfırdır** ve
devir sorgusu hiç çalıştırılmaz.

**Ders:** Şema testleri sorgunun `balance_after` okuduğunu ve `SUM()` kullanmadığını
doğruluyordu; ikisi de doğruydu. Yanlış olan **semantikti**. Parasal bir hesaplama
yazdığında sonucu her zaman bağımsız bir kaynakla karşılaştır — burada doğru kontrol
"sınırsız özetin kapanışı, son satırın `balance_after` değerine EŞİT olmalı" idi.

### 26. `npm run lint` yeşil ama tip hatası var — tip kontrolü hiç çalışmıyor
**Sebep:** `tsconfig.json` bir **solution** dosyasıydı (`"files": []` + `references`).
Bu yapıda `tsc --noEmit` referans edilen projeleri derlemez; hiçbir şey yapmadan
**başarıyla çıkar**. Aylardır "lint 0" raporlarının ESLint kısmı gerçek, tip kontrolü
kısmı boştu — 61 gizli tip hatası birikmişti ve eksik bir React prop'unu ancak esbuild
yakaladı.
**Çözüm:** `tsc --noEmit` yerine **`tsc -b`**. `package.json`'da hem `lint` hem `build`
betiği bunu kullanır. Proje referansı kullanan her yerde kural budur.

### 27. `exactOptionalPropertyTypes` ile RPC argümanları
**Sebep:** Bu ayar açıkken "anahtar hiç yok" ile "anahtar var, değeri `undefined`"
farklı şeylerdir. Supabase'in ürettiği tipler isteğe bağlı parametreleri `p_x?: string`
diye yazar; `p_x: undefined` geçmek tip hatasıdır.
**Çözüm:** `src/lib/rpc.ts` içindeki `rpcArgs()` yardımcısıyla sar. `undefined` değerli
anahtarları siler; zorunlu alanlar tip düzeyinde zorunlu kalır.
**DİKKAT:** Argümanı atlamak, fonksiyonun SQL varsayılanını devreye sokar. Parametrenin
`DEFAULT`'u yoksa PostgREST hata verir — bu yüzden `save_product` ve `save_product_group`
fonksiyonlarının `p_id` parametresine `default null` eklendi. Varsayılan eklemek imza
kimliğini değiştirmez, `create or replace` yeterlidir (kilitli kural 6 ihlal olmaz).

### 28. `save_product` çağrısı alanı boşaltıyor
**Sebep:** Bu RPC **tam değiştirme** yapar: gönderilmeyen `p_category`, `p_description`,
`p_group_id` alanları `null`'a çekilir. Kısmi güncelleme değildir.
**Çözüm:** Formu her zaman tam gönder. Yalnız bir alanı değiştirmek için ürünün mevcut
değerlerini okuyup hepsini birlikte gönder.

### 29. "Kaydet"e basılıyor, hiçbir şey olmuyor (sessiz doğrulama hatası)
**Sebep:** react-hook-form doğrulama düşerse `onSubmit` HİÇ çağrılmaz. Alanın kendi
hata satırı yoksa kullanıcı düğmeye basar ve ekranda hiçbir değişiklik olmaz — istek
bile gitmez, konsolda da iz kalmaz. Ürün formunda 2000 karakteri aşan açıklamada tam
olarak bu yaşandı: kullanıcı "kaydetmiyor" dedi, sebebi görünmüyordu.
**Çözüm iki katmanlı:**
1. `handleSubmit(submit, onInvalid)` — ikinci parametre ZORUNLU sayılsın. Geçersiz
   gönderimde ilk hatayı üst bantta göster; hiçbir tıklama sessiz kalmasın.
2. Kaydedilen HER alanın kendi hata satırı olsun. Ortak `Field` yardımcısı bunu
   sağlar; elle yazılan bir alan (ör. doğrudan konulan `<textarea>`) bu ağın dışında
   kalır — yeni alanı ortak yardımcıyla ekle.

**Teşhis yöntemi:** Playwright ile düğmeye bas ve `rpc/...` isteğinin gidip gitmediğine
bak. İstek hiç gitmiyorsa hata sunucuda değil, formun doğrulamasındadır.

### 30. Gömülü kayıt "yok" sayılıyor — PostgREST bire-bir ilişkiyi NESNE döndürür
**Sebep:** PostgREST bire-bir gömmeyi kimi yerde tek elemanlı **dizi**, kimi yerde doğrudan
**nesne** döndürür (ilişkiyi tekil algıladığında). `Array.isArray` ile başlayıp diziyi
karşılamayan okuyucu, nesne geldiğinde kaydı **görmez ve sessizce yedeğe düşer**.
`orderMapping.ts`'te yaşandı: `order_item_retail_prices` okunamayınca sipariş listesi ve
detayı, sipariş anında donmuş fiyat yerine ürünün **güncel** liste fiyatını gösteriyordu —
45.000'lik sipariş 40.000, 43.000'lik sipariş de 40.000 görünüyordu.
**Çözüm:** Gömme okuyucusu her iki biçimi de karşılasın (`finance.ts`'teki `asRows`,
`orderMapping.ts`'teki `firstOf` bunu yapar). Yeni bir gömme yazdığında iki biçim için de
test yaz — tip sistemi bunu yakalamaz, `unknown` üzerinden geçer.

**Ders:** Yanlış sayı gösteren ekranda "yedeğe düşmüş olabilir mi" sorusunu erken sor.
Ayırt edici belirti: **farklı** siparişlerin **aynı** tutarı göstermesi. O tutar
çoğunlukla ürünün güncel fiyatıdır ve kaydın hiç okunmadığını söyler.

### 31. Katman taşıması sonrası sözleşme kopukluğu — hesap iki tarafın da dışında kalır
**Sebep:** Bir tutarı sunucu mu ekliyor istemci mi belirsizken katman kararı değişince
**ikisi de eklemeyi bırakır**. `20260814020000` özel talep farkını KATMAN 3'ten KATMAN 2'ye
taşırken RPC'deki `retail_unit_price = retail + diff` toplamasını kaldırdı; istemci
devralmadı. Sonuç: fark üreticiye borç yazılıyor ama perakende tarafında yok sayılıyordu —
takip sayfası, müşteri carisi ve sipariş listesi üçü birden farkı yutuyordu. Hiçbir test
kırılmadı, çünkü sözleşmeyi kilitleyen test yoktu.
**Çözüm:** "Bu tutarı kim ekler" sorusunu **kolon yorumunda** yaz (`retail_unit_price`
HER ŞEY DAHİL'dir) ve karşılığını **istemci tarafında bir testle kilitle**. Katman kararı
değiştiren her migration'da, o kolonu yazan istemci kodunu aynı commit'te gözden geçir.

**Ders:** Bir alanın "dahil mi değil mi" olduğu tutara bakarak anlaşılamaz. Geçmiş veriyi
onarırken bu yüzden genel `UPDATE` yazma — farkı zaten içeren kayıtları ikinci kez şişirir;
etkilenen kayıtları kimlikle hedefle.

### 32. `supabase db push` — "failed to create migration table: wsarecv / connection forcibly closed"
**Sebep:** Supabase'in **doğrudan** veritabanı bağlantısı (`db.<ref>.supabase.co:5432`)
IPv4 eklentisi yoksa **yalnız IPv6**'dır. CLI IPv6 ile bağlanır, ağ (ISP/modem/güvenlik
duvarı) oturumu düşürür. Hata mesajındaki adreslerin `[2a02:...]` biçiminde olması
ayırt edici belirtidir — bu bir yetki hatası DEĞİL, ağ hatasıdır. `supabase login`
başarılı olduğu halde `db push` bu noktada patlar.
**Çözüm:** IPv4 üzerinden çalışan **session pooler**'a bağlan:
```
npx supabase db push --db-url "postgresql://postgres.<PROJECT_REF>:<SIFRE>@aws-0-<BOLGE>.pooler.supabase.com:5432/postgres"
```
Bağlantı dizesi: Dashboard → **Connect** → **Session pooler** (port 5432, IPv4).
Şifrede `@ : / ?` gibi karakter varsa URL-encode et (`@` → `%40`).
Alternatifler: `test-ipv6.com` ile ağını sına; kalıcı çözüm için IPv4 eklentisi (ücretli).
Ard arda iki yanlış şifre denemesi IP yasağı doğurur → Dashboard → Database Settings →
**Unban IP**.

**Ders:** `db push` iki ayrı kimlik ister — hesap jetonu (`supabase login`) ve **veritabanı
şifresi**. Biri çözülünce diğeri karşına çıkar; "login başarılı" bağlantının kurulacağı
anlamına gelmez.
