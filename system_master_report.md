# 🌉 KÖPRÜ B2B Platformu — Kapsamlı Sistem Mimarisi, Süreçler ve İş Kuralları Kılavuzu

---

## 1. 📌 PROJE NEDİR VE AMACI NEDİR?

**KÖPRÜ**, mobilya ve üretim sektöründeki **Üreticiler (Fabrikalar / İmalatçılar)** ile **Perakendeciler (Mağazalar / Bayiler)** arasındaki tüm ticari operasyonları (ürün kataloğu, sipariş, sevkiyat, cari hesap defteri, stok, SSH ve iade süreçleri) tek bir dijital platformda buluşturan yeni nesil bir **B2B (Business-to-Business) Ekosistemidir**.

### Temel Misyon:
* Telefon, mesajlaşma uygulamaları ve Excel üzerinde kaybolan sipariş, sevkiyat ve cari takibini standardize etmek.
* Üretici maliyetlerini gizli tutarken, perakendeciye özel B2B toptan fiyatlandırma ve mağaza satış fiyatı yönetimini sağlamak.
* Geleneksel yazılımların aksine, **misafir (abone olmayan) firmaların da sisteme sıfır sürtünmeyle dahil olabilmesini** sağlayan esnek ve güvenli bir ağ yapısı kurmak.

---

## 2. 👥 KULLANICI ROLLERİ VE AKTÖR TİPLERİ

Platformda **4 ticari aktör türü** ve **1 Platform Yöneticisi** bulunur:

```
                          ┌────────────────────────┐
                          │   PLATFORM YÖNETİCİSİ   │ (SuperAdmin - admincyo)
                          │   Tüm Sistemi Denetler │
                          └───────────┬────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 │                                         │
        ┌────────▼────────┐                       ┌────────▼────────┐
        │  ÜRETİCİ TARAFI │                       │PERAKENDECİ TARAFI│
        └────────┬────────┘                       └────────┬────────┘
                 │                                         │
     ┌───────────┴───────────┐                 ┌───────────┴───────────┐
     │                       │                 │                       │
┌────▼──────────┐     ┌──────▼────────┐   ┌────▼──────────┐     ┌──────▼────────┐
│  ÜYE ÜRETİCİ  │     │MİSAFİR ÜRETİCİ│   │ÜYE PERAKENDECİ│     │MİSAFİR PERAK. │
│(Tam Yetkili)  │     │(Tek Sponsorlu)│   │(Tam Yetkili)  │     │(Tek Sponsorlu)│
└───────────────┘     └───────────────┘   └───────────────┘     └───────────────┘
```

### 1. Üye Üretici (Abone - Tam Yetkili):
Üye Üretici, KÖPRÜ ekosisteminin imalat ve tedarik merkezidir. Panelinde aşağıdaki tüm modülleri tam yetkiyle yönetir:

* 🏠 **Anasayfa (Dashboard / Canlı Komuta Merkezi - `/m`):**
  * **Canlı Operasyonel Sayaçlar:** Bekleyen siparişler, üretim bandındakiler (`uretimde`), sevkiyata hazır ürünler, açık SSH talepleri ve bekleyen iadeler anlık özetlenir.
  * **Son Hareketler Akışı:** Fabrikaya düşen en son siparişler, yeni bayi katılımları ve cari hareketler canlı izlenir.
  * **Hızlı İşlem Kısayolları:** Tek tıkla yeni ürün ekleme, bayi daveti gönderme ve duyuru yayınlama aksiyonları.
* 🏷️ **Ürün Yönetimi & Katalog:** Kendi ürünlerini, setlerini, varyantlarını (kumaş, ayak, renk) ve ölçülerini oluşturur.
* 💵 **Maliyet & Fiyat Belirleme:** Ürünlerin Katman 1 imalat maliyetlerini (`product_costs`) ve Katman 2 B2B toptan satış fiyatlarını (`supplier_price`) belirler.
* 👥 **Müşteri & Bayi Yönetimi:** Birden fazla perakendeciyle (üye veya misafir) aynı anda çalışabilir, bayilere özel iskonto/indirim oranları tanımlar.
* 📦 **Stok Yönetimi:** Hazır mamul stoklarını manuel veya Excel/CSV ile toplu günceller.
* 🛒 **Sipariş & Üretim Takibi:** Gelen siparişleri onaylar, üretim aşamalarını (`uretimde`) ve kısmi/tam sevkiyatları yönetir.
* 💰 **Cari Hesaplar & Finans:** Bayilerin cari hesap borç/alacak hareketlerini, vadelerini ve ekstrelerini takip eder. Manuel cari işlem (tahsilat, ek masraf, iskonto düzeltmesi) ekleyebilir: Karşı taraf **ÜYE** ise işlem onun onayına gider; karşı taraf **MİSAFİR** ise işlem doğrudan işler (misafir yalnız izler).
* 🛠️ **SSH (Satış Sonrası Servis) Yönetimi:** Bayilerden gelen arıza/parça taleplerini inceler, yedek parça tedariğini sağlar ve süreci tamamlar.
* 🔄 **İade Talepleri Yönetimi:** Hasarlı/uyuşmayan ürünlerin iade taleplerini onaylar veya reddeder; onaylanan iadelerin cariye ve stoğa entegrasyonunu sağlar.
* 📢 **Duyuru Yönetimi:** Tüm bayilerine veya seçili bayilere yönelik kampanya, fiyat artışı veya fabrika çalışma takvimi duyuruları yayınlar.
* 📊 **Performans Raporları & Analitik Modülü (`/m/raporlar`):**
  * **Finansal KPI'lar:** Toplam Sipariş, Toplam Ciro, Aktif Bayi Sayısı ve Net Kâr (Katman 2 Satış − Katman 1 İmalat Maliyeti) takibi.
  * **Müşteri & Ürün Liderlik Tablosu:** En çok ciro getiren bayiler ve en yüksek kâr marjı sağlayan en çok satan ürünler.
  * **Kalite & Risk Analizi (3 Eşit Kart):** SSH & Arıza Yoğunluğu (sık bozulan parçalar/ürünler), En Çok İptal Edilenler ve En Çok İade Edilen modellerin detaylı dökümü.
* 👥 **Ekip (Personel) Yönetimi:** Kendi fabrikasındaki/ofisindeki ekibi tanımlar ve yetkilendirir.

#### 🛡️ Ekip Yönetiminin Özellikleri ve Rolleri:
1. **Sahip (Owner):**
   * Firmanın en üst düzey yetkilisidir. Ekip personeli ekleme/çıkarma, şifre sıfırlama, müşteri tanımlama ve tüm finansal verilere erişim yetkisine sahiptir.
2. **Personel (Staff - Satış / Operasyon / Fabrika):**
   * Günlük sipariş ve sevkiyat işlemlerini yürütür.
   * **Müşteri Kapsamı (Scope) Zırhı:** Personel yalnızca sahibin kendisine atadığı müşterileri/bayileri görebilir. Kapsamı atanmamış personel diğer müşterilerin sipariş veya cari verilerine erişemez.
3. **Muhasebeci (Accountant):**
   * Yalnızca cari hesaplar, ödeme/tahsilat kayıtları, ekstreler ve finansal mutabakat işlemlerine odaklanır.
4. **Ekip Güvenlik ve Giriş Mekanizması:**
   * **Ortak VKN / Kullanıcı Kodu ile Giriş:** Personel giriş yaparken firmanın VKN'sini yazar, *"Personel Girişi"* kutucuğunu işaretler ve kendi şifresiyle oturum açar.
   * 🔑 **Aynı Organizasyon İçi Şifre Benzersizliği Kuralı (Kritik Mimari Kural):**
     * Bir firmanın Sahibi (Owner) ile tüm Personelleri (Staff / Accountant) **aynı firma VKN'si (kullanıcı kodu) ile giriş yaptıkları için**, organizasyon içindeki her bir personelin ve sahibin **şifresi kesinlikle benzersiz (unique) olmak zorundadır**.
     * Aynı organizasyonda iki personelin şifresi aynı olamaz; böylece girilen şifre üzerinden hangi personelin oturum açtığı, yetkileri ve kapsamı (scope) sisteme hatasız olarak yüklenir.
   * 🔐 **Kullanıcı Kendi Şifresini Güncelleme (Self Password Change):**
     * İster **Platform Admini**, ister **Üretici Sahibi/Personeli**, ister **Perakendeci Sahibi/Personeli** olsun, tüm kullanıcılar sağ üstteki **"Şifre Değiştir"** butonu üzerinden mevcut şifrelerini doğrulayarak kendi şifrelerini diledikleri zaman güvenle güncelleyebilirler.
   * **Anında Oturum İptali:** Sahip bir personeli *"Pasife"* aldığı anda personelin platform oturumu anında sonlanır.
   * **Hesap Kilitleme Koruması:** 5 ardışık hatalı şifre denemesinde personelin hesabı brute-force saldırılarına karşı otomatik olarak kilitlenir.

### 2. Üye Perakendeci (Abone - Tam Yetkili):
Üye Perakendeci, KÖPRÜ ekosisteminin mağaza, satış ve müşteri yönetimi merkezidir. Panelinde aşağıdaki tüm modülleri tam yetkiyle yönetir:

* 🏠 **Anasayfa (Dashboard / Mağaza Komuta Merkezi - `/r`):**
  * **Canlı Mağaza Sayaçları:** Verilen aktif siparişler, yoldaki sevkiyatlar, açık SSH talepleri ve bekleyen iade süreçleri özetlenir.
  * **Son Hareketler:** Son sipariş güncellemeleri, tedarikçi duyuruları ve mağaza işlem akışı canlı izlenir.
  * **Hızlı Erişim:** Tek tıkla katalog arama, sepet tamamlama ve yeni üretici daveti gönderme aksiyonları.
* 🏬 **Tedarikçi Yönetimi:** Platformdaki birden fazla üreticiyle (üye veya misafir) aynı anda aktif tedarikçi ilişkisi kurabilir. WhatsApp davet linkiyle yeni üreticileri ekosisteme davet eder.
* 🛍️ **Katalog, Sepet & Sipariş:**
  * **Sıkı Tedarikçi İzolasyonu Kuralı (Kritik Mimari Standart):**
    * Perakendeci ister belirli bir üreticiyi seçsin, ister *"Tüm Üreticiler"* görünümünde olsun; **YALNIZCA aktif tedarikçi ilişkisi (`status = 'active'`) bulunan üreticilerin ürünlerini görebilir**.
    * İlişkisi olmayan, farklı üreticilere ait veya sahipsiz (`TEDARİKÇİ: —`) hiçbir ürün perakendecinin kataloğuna **asla sızamaz**. Bu kural hem veritabanı API sorgusunda (`ownerOrgIds`) hem de istemci filtreleme katmanında çift kilitlidir.
  * Üreticilerin güncel kataloglarını inceler, ürünleri sepete ekler.
  * Sepet aşamasında mağazadaki **Satışçı Personeli** seçer, sipariş notu ekler ve siparişi tek tıkla üreticiye iletir.
  * Siparişlerinin üretim bandındaki (`uretimde`), kısmi sevkiyatındaki veya teslimatındaki durumunu canlı takip eder.
* 🏷️ **Ürün Yönetimi Modülü & Fiyatlandırma (`/r/urun-yonetimi`):**
  * Üye perakendecide Ürün Yönetimi modülü **daima açıktır**.
  * **Üye Üreticilerin Ürünleri:** Üreticinin belirlediği toptan B2B fiyatına (Katman 2) bakarak, mağazasının perakende satış fiyatını (Katman 3) buradan belirler.
  * **Misafir Üreticinin Ürün Yönetimi Anahtarı (`can_edit_catalog`):**
    * Üye Perakendecinin *"Tedarikçilerim"* sayfasında, misafir üreticisi için **Ürün Yönetimi Anahtarı** bulunur:
    * **Anahtar AÇIK (`can_edit_catalog = true`):** Yetki devredilmiştir! Misafir üretici panel kullanmak istemediğinde, Üye Perakendeci üreticinin ürünlerini, resimlerini, kumaş/renk varyantlarını ve maliyet/fiyatlarını kendi panelinden (`/r/urun-yonetimi`) bizzat sisteme ekler ve yönetir. Misafir üreticide ürün yönetimi menüsü gizlenir.
    * **Anahtar KAPALI (`can_edit_catalog = false`):** Yetki üreticide kalır. Ürünleri üretici kendi panelinden girer; perakendeci sadece kendi satış fiyatını belirler.
* 🛠️ **SSH (Satış Sonrası Servis) Süreçleri:**
  * Son müşterisinden gelen arızalı/hasarlı ürünler için parça adı, arıza açıklaması ve fotoğraf yükleyerek üreticiye SSH talebi başlatır.
  * Üreticinin parça gönderimini takip eder ve süreç bittiğinde talebi tamamlar/kapatır.
* 🔄 **İade Süreçleri:**
  * Hatalı veya uyuşmayan ürünler için üreticiye iade talebi başlatır; üretici onayladığında cariye alacak ve stoğa yansımasını izler.
* 💰 **Üretici B2B Carisi Modülü (`/r/cari` - Ayrı Bağımsız Modül):**
  * Üye perakendecinin **üreticilerle olan toptan B2B borç/alacak defteridir**.
  * Yalnızca **Katman 2 (Toptan B2B Satış Fiyatı)** üzerinden işler.
  * Sipariş onaylandığında üreticiye olan borç artar; yapılan ödemelerle düşer.
  * Manuel eklenen hareketler karşı taraf **Üye Üretici** ise onayına gider; **Misafir Üretici** ise doğrudan işler.

* 🏦 **Kasa ve Finans Yönetimi Modülü (`/r/finans` - Mağaza İç Finans Merkezi):**
  Perakendecinin kendi mağaza içi nakit akışını, banka hareketlerini ve **nihai tüketicilerini (mağaza müşterilerini)** yönettiği bağımsız finans modülüdür. 4 ana sekmeden oluşur:
  1. 💵 **Kasa Hesabı (Nakit):** Mağazada elden alınan nakit tahsilatlar, peşinatlar ve yapılan günlük mağaza giderleri/masrafları.
  2. 💳 **Bizim POS (Banka):** Mağazanın kendi banka POS cihazından çekilen müşteri kredi kartı ödemeleri ve banka hareketleri.
  3. 🏢 **Üretici POS:** Mağazanın, üreticinin POS cihazı üzerinden doğrudan üreticiye çektirdiği tahsilatlar. *(Bu işlem hem nihai müşterinin borcunu kapatır, hem de perakendecinin üreticiye olan toptan borcundan otomatik düşer!)*
  4. 👥 **Müşteri Carileri (Nihai Tüketici Takibi):** Mağazanın müşterileri (Ahmet Yılmaz vb.) için açılan müşteri cari defteri.

---

### 🛒 Sepette Müşteri İletişim Alanları ve Finansal Akış:

* 🛒 **Sepette Müşteri İletişim Alanları:** Sipariş oluşturulurken Müşteri Adı, Telefon, E-posta, **İl (ayrı alan)**, **İlçe (ayrı alan)**, Açık Adres ve sade başlığıyla **Sipariş Notu** toplanır.
* 🎯 **Müşteri Carisi Tekilleştirme Kuralı (Aynı Kişi Sayılma Kriteri):**
  * İki farklı siparişin aynı nihai müşteriye ait sayılıp tek bir cari satırında birleşebilmesi için müşterinin **Ad-Soyad, Telefon, İl, İlçe ve Açık Adres** bilgilerinin **birebir örtüşmesi** zorunludur.
  * Bilgileri farklı olan müşteriler (örneğin aynı isimli ancak farklı adres/telefona sahip kişiler) ayrı cariler olarak takip edilir.
* 👥 **Müşteri Bilgileri & Takip Modalı (`CustomerInfoModal`):**
  * Finans modülünde *"Müşteri Bilgileri"* tıklandığında müşterinin Telefon, E-posta, İl (ayrı satır), İlçe (ayrı satır) ve Açık Adres detayları listelenir.
  * **Kök Sipariş Mantığı:** Parçalı sevkiyatlar (`/1`, `/2`) listelenmez; müşterinin yalnızca **Ana Kök Siparişleri** listelenir (çünkü kök sipariş linki tüm parçalı durumları tek sayfada canlı sunar).
  * **Üretici Bilgisi:** Sipariş satırında hangi üreticiye ait olduğu (Örn: `260825-0001` • *İsmail Mobilya*) açıkça gösterilir.
  * Her siparişin yanında perakendecinin tek tıkla müşteriye iletebilmesi için 📋 **"Takip Linkini Kopyala"** butonu yer alır.
* 📱 **Duyarlı (Responsive) Tasarım Standardı — Masaüstü Tablo ➔ Mobil Akıllı Kartlar (Card View):**
  * Masaüstü ekranlarda (`md` ve üzeri) 7-10 sütunlu geniş Excel tarzı detaylı veri tabloları korunur.
  * Mobil ekranlarda (`md` altı) yatay kaydırma (scroll) tamamen ortadan kaldırılarak satırlar **Akıllı Bilgi Kartlarına (Card View)** dönüşür; sipariş no, durum rozeti, müşteri, tutar ve detay açma butonları dikey akışta tek parmakla rahatça kullanılır.

1. **Sepette Müşteri Bilgilerinin Girilmesi:**
   * Perakendeci sepet ekranında (`CartPage`), siparişi nihai müşteriye bağlamak için **Müşteri Adı Soyadı (`customer_name`)**, **Telefon (`customer_phone`)**, **Teslimat Adresi** ve **Termin Tarihi** alanlarını doldurur.
   * Bu bilgiler girildiğinde, sistem Finans modülündeki **"Müşteri Carileri"** sekmesinde o müşteri için otomatik olarak bir cari hesap kartı açar (veya mevcut müşterinin kartıyla eşleştirir).
   * Müşterinin cari hesabına **Katman 3 (Perakende Satış Fiyatı)** üzerinden toplam sipariş tutarı kadar **BORÇ** yazılır.

2. **Sepette Nihai Müşteriden Ödeme/Peşinat Alınabilir mi? (EVET, Tam Entegre!):**
   * Sepet ekranındaki **Peşinat / Ödeme Paneli (`DownPaymentPanel`)** üzerinden müşteri sipariş anında ödeme yapabilir:
     * **Peşinatsız Sipariş:** Perakendeci dilerse peşinat almadan siparişi tamamlayabilir (kalan bakiye müşteri carisinde açık borç olarak bekler).
     * **Nakit Peşinat:** Alınan tutar anında **Kasa Hesabı (Nakit)** sekmesine gelir işlenir ve müşteri carisinden düşer.
     * **Bizim POS (Kredi Kartı):** Alınan tutar **Bizim POS (Banka)** sekmesine gelir işlenir ve müşteri carisinden düşer.
     * **Üretici POS:** Müşterinin kartı üretici POS'undan çekildiğinde:
       * Müşterinin mağazaya olan borcundan düşer.
       * **Aynı anda Perakendecinin Üreticiye olan B2B Carisinden de otomatik olarak düşer!**
* 📢 **Duyurular:** Üreticilerin yayınladığı kampanya, fiyat artışı ve fabrika tatil duyurularını takip eder, okuduklarını listesinden temizler/siler.
* 📊 **Raporlar:** Mağaza satış performansı, en çok satan modeller, ciro, kârlılık ve iade/iptal oranlarını analiz eder.
* 👥 **Ekip (Personel) Yönetimi:**
  * Mağaza satış personellerini (`staff`) ve mağaza muhasebecilerini (`accountant`) tanımlar.
  * Sepet sayfasındaki **"Satışçı *"** listesinde mağazanın kendi ekibi listelenir; böylece hangi satışı hangi personelin yaptığı raporlanır.
  * Personel şifrelerini yönetir, gerektiğinde personeli pasife alarak oturumunu anında kapatır.

### 3. Misafir Üretici (Sponsorlu):
* Sisteme bir **Üye Perakendeci** tarafından davet edilmiş veya eklenmiştir.
* **Kilitli Kural:** Yalnızca kendisini sisteme dahil eden/giriş yaptığı sponsor perakendecinin siparişlerini görür ve onunla işlem yapar. Platformdaki diğer hiçbir yabancı perakendeciyi göremez.

### 4. Misafir Perakendeci (Sponsorlu):
* Sisteme bir **Üye Üretici** tarafından müşteri/bayi olarak eklenmiştir.
* **Kilitli Kural:** Giriş ekranında hangi sponsor üreticinin VKN'si ile giriş yaparsa, o oturum boyunca **yalnızca o üreticinin ürün kataloğunu, duyurularını ve siparişlerini** görür.

### 5. Platform Yöneticisi (Platform Admin - `admincyo`):
* Platformun genel sahibi ve denetleyicisidir. Hiçbir üretici veya perakendeciye taraf değildir.
* Sistem genelindeki tüm organizasyonları, abonelik paketlerini, modül izinlerini ve denetim loglarını yönetir.

---

## 3. 🔗 B2B İLİŞKİ MEKANİZMASI VE YETKİ DEVRİ

İki organizasyon arasındaki tüm ticaret, `relationships` tablosundaki dijital köprü üzerinden yürütülür.

### A. İlişki Kurma Yolları:
1. **Doğrudan Ekleme:** Üretici "Müşteri Yönetimi"nden perakendeciyi ekler veya Perakendeci "Tedarikçi Ekle"den üreticiyi ekler.
2. **WhatsApp Davet Linki:** Üretici veya Perakendeci, sisteme davet etmek istediği firmaya özel tek kullanımlık güvenli bir davet linki gönderir.

### B. İlişki Yaşam Döngüsü (States):
* `pending` (Onay Bekliyor) ➔ Karşı tarafın daveti/onayı beklenir.
* `active` (Aktif) ➔ İki firma arasında tüm ticari köprüler açılır:
  * 🛍️ **Ürün Kataloğu & Fiyat Listesi**
  * 🛒 **Sipariş Verme & Takip**
  * 💰 **Cari Hesap Defteri & Bakiye**
  * 🛠️ **SSH (Satış Sonrası Servis) Talepleri**
  * 🔄 **İade Talepleri & Stok/Cari Entegrasyonu**
  * 📢 **Üretici Duyuruları & Kampanya Bildirimleri**
* `rejected` (Reddedildi) / `terminated` (Sonlandırıldı) ➔ Ticari ilişki durdurulur; eski geçmiş kayıtlar ve cari defter şeffaf şekilde korunur ama yeni sipariş, SSH veya iade açılamaz, duyurular kesilir.

### C. Katalog Yönetim Yetki Devri Anahtarı (`can_edit_catalog`):
Üye Perakendeci ile Misafir Üretici arasındaki en kritik inovasyon kuralıdır:
* **Anahtar KAPALI (`can_edit_catalog = false`):**
  * Ürünleri bizzat **Misafir Üretici** kendi panelinden (`/m/urunler`) ekler, resimlerini yükler ve yönetir.
  * Perakendecinin ürün ekleme ekranı kilitlidir.
* **Anahtar AÇIK (`can_edit_catalog = true`):**
  * Misafir Üretici bilgisayarla/panelle uğraşmak istemediğinde, yetkiyi perakendeciye devreder.
  * **Üye Perakendeci**, üretici adına ürünleri kendi panelinden (`/r/urun-yonetimi`) sisteme girer ve yönetir.
  * Bu durumda Misafir Üreticinin panelinde "Ürün Yönetimi" menüsü otomatik olarak gizlenir ve kilitlenir.

---

### D. Misafir Üretici Ürün Sahipliği & Yeni Perakendeciye Katalog Aktarım Kuralı (Kritik Kural):
Bir Üye Perakendeci (Perakendeci B), sistemde halihazırda var olan bir **Misafir Üreticiyi** kendi tedarikçilerine dahil ettiğinde ürünlerin aktarımı şu kurala göre çalışır:

1. **Ürünleri Misafir Üretici KENDİSİ Eklediyse (Önceki Perakendeci Anahtarı Kapatıp Yetkiyi Üreticiye Verdiyse):**
   * Ürünler bizzat üretici tarafından sisteme girildiği için bu ürünler **üreticinin genel fabrika kataloğu** kabul edilir.
   * Yeni Üye Perakendeci (B) bu üreticiyle ilişki kurduğunda, bu ürünler **OTOMATİK OLARAK YENİ PERAKENDECİ B'NİN KATALOĞUNA GELİR VE LİSTELENİR**.

2. **Ürünleri Önceki Üye Perakendeci (A) Eklediyse (Önceki Perakendeci Anahtarı Açıp Ürünleri Bizzat Kendisi Girdiyse):**
   * O ürünler Perakendeci A'nın kendi inisiyatifiyle girdiği özel çalışma/katalog verisidir.
   * Bu ürünler **OTOMATİK OLARAK YENİ PERAKENDECİ B'YE GELMEZ (AKTARILMAZ)**.
   * Yeni Perakendeci B, o üretici için boş/temiz bir katalogla başlar; isterse yetki anahtarını açarak üretici adına kendi ürünlerini girer veya üreticinin bizzat ürün girmesini ister.

---

### E. Misafir Firmanın Üyeliğe Yükselmesi (Upgrade) ve Çoklu Hesap/Ürün Birleşimi (Merge Engine):
Bir misafir firma (üretici veya perakendeci), 10 farklı üye firma tarafından sisteme dahil edilmiş ve 10 farklı misafir ilişkisine sahip olabilir. Bu firma **Üye (Abone)** olmak istediğinde sistemde şu adımlar otomatik işler:

1. **Tek VKN ve Çoklu İlişki Koruması:**
   * Sistemde VKN tekil anahtardır. 10 farklı ilişki, sipariş geçmişi ve cari bakiyeler **hiçbir veri kaybı olmadan korunur**.
2. **Sponsor Giriş Kısıtlamasının Kalkması:**
   * Firma artık giriş yaparken sponsor VKN'si yazmak zorunda kalmaz; **doğrudan Üye Girişinden kendi VKN'si ve şifresiyle** oturum açar.
   * Panelinde 10 müşterisini/tedarikçisini aynı anda yan yana görür ve yönetir.
3. **Ürünlerin Otomatik Birleştirilmesi (`merge_duplicate_products`):**
   * Farklı perakendecilerin bu üretici adına girdiği ürünler üreticinin kendi merkez ürün havuzuna devrolur.
   * Aynı isimli kopyalar tek bir ana ürüne indirgenir.
   * Eski siparişlerdeki (`order_items`) ve SSH taleplerindeki (`ssh_requests`) ürün bağları kopmasın diye tüm geçmiş kayıtlar ana ürüne taşınır (`ON DELETE SET NULL` zırhı).
4. **Fiyat Farkı Uyarısı (`price_review_needed`):**
   * Eğer birleştirilen kopyalarda farklı toptan fiyatlar tanımlanmışsa, sistem üreticinin paneline **"Fiyat İncelemesi Gerekli"** uyarısı koyar ve üretici nihai fiyatı belirler.

---

## 4. 🏷️ ÜÇ FİYAT KATMANI MİMARİSİ (A4 KURALI)

KÖPRÜ'de fiyatlar asla tek bir rakamdan ibaret değildir. Sistemde 3 bağımsız fiyat katmanı çalışır:

```
┌────────────────────────────────────────────────────────────────────────┐
│ KATMAN 1: ÜRETİCİ MALİYETİ (product_costs tablosu)                    │
│ YALNIZCA Üreticinin kendisi görür. Perakendeciye ASLA sızamaz.        │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ (Kâr Marjı Eklenir)
┌──────────────────────────────────▼─────────────────────────────────────┐
│ KATMAN 2: B2B TEDARİKÇİ SATIŞ FİYATI (products.supplier_price)         │
│ Üreticinin Perakendeciye sattığı toptan fiyattır.                     │
│ Sipariş toplamları ve Cari Hesap Borçları BU FİYAT üzerinden işler.   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ (Perakendeci Kendi Kârını Belirler)
┌────────────────────────────────────────────────────────────────────────┐
│ KATMAN 3: PERAKENDECİ SATIŞ FİYATI (retail_prices / order_item_retail) │
│ Perakendecinin nihai müşteriye (son tüketiciye) satış fiyatıdır.       │
│ • Mağaza Teklifi ve Müşteri Sipariş Fişinde kullanılır.                │
│ • Perakendeci Finansında: Nihai Tüketicinin Müşteri Carisinde,        │
│   tahsilat/bakiye takibinde BU FİYAT dikkate alınır.                   │
│ • Kâr Analizinde: (Katman 3 - Katman 2) = Perakendecinin Net Kârı.    │
└────────────────────────────────────────────────────────────────────────┘
```

* **İndirim Oranı (`discount_rate`):** Üretici belirli bir bayiye özel indirim oranı (%10, %15 vb.) tanımladığında, Katman 2 fiyatına bu indirim uygulanarak sipariş oluşturulur.

---

## 5. 📦 STOK YÖNETİMİ VE SİPARİŞE GÖRE ÜRETİM MODELİ

Mobilya sektörünün doğası gereği KÖPRÜ, **hem hazır stoklu satışı hem de siparişe göre üretimi (Made-to-Order)** destekler.

1. **Stok Girişi & Takibi:**
   * Üretici hazır mamul stoklarını ürün bazında manuel veya **Excel / CSV İçe Aktarım** ile toplu olarak güncelleyebilir.
2. **Stok 0 Olsa Dahi Sipariş Verilebilir (Siparişe Dayalı Üretim):**
   * **Stok miktarı 0 olsa veya hazırda ürün bulunmasa dahi sipariş KESİNLİKLE ENGELLENMEZ.**
   * Perakendeci siparişi geçer; hazır stok varsa düşer, yoksa üretici siparişi doğrudan **"Üretime Alındı (`uretimde`)"** durumuna alarak fabrikada imalata başlar.
3. **Sipariş Anında Stok Güncellemesi:**
   * Perakendeci siparişi onayladığında `update-stock` motoru hazır stok miktarını günceller.
4. **İptal ve İadelerde Stok Geri Yükleme:**
   * Bir sipariş iptal edildiğinde veya iade talebi onaylandığında, düşülen stok miktarı **otomatik olarak üreticinin stoğuna geri eklenir**.

---

## 13. 📱 MOBİL ERGONOMİ, RESPONSİVE STANDARTLARI VE AKILLI KART (SMART CARD) MİMARİSİ

Platformun tüm ekranları hem **Masaüstü (Desktop / Geniş Ekran)** hem de **Mobil (Akıllı Telefon / Dar Ekran)** görünümlerinde sıfır hata ve kusursuz ergonomi ile çalışacak şekilde standardize edilmiştir:

1. **Masaüstü Tabloların Korunması (`hidden md:block`):**
   * Bilgisayardan girildiğinde geniş ekranların tüm avantajı korunur; 8-11 sütunlu detaylı tablolar, yapışkan başlıklar (sticky thead), sıralamalar ve geniş veri hücreleri %100 orijinal haliyle gösterilir.
2. **Mobilde Akıllı Kartlar (`md:hidden`):**
   * Cep telefonlarında yatay kaydırma çubuğu (horizontal scrollbar) ve sağa-sola taşma oluşmaması için tablolar yerini dikey akışlı, ferah ve dokunmatik dostu **Akıllı Kartlara (Smart Cards)** bırakır.
   * **Uygulanan Modüller:**
     * 🛒 **Siparişler (`/m/siparisler`):** Sipariş No, Durum Rozeti, Tutar, Üretim Durumu Seçici ve Genişleyen Kalemler.
     * 💰 **Cari Hesaplar (`/m/cari`):** Firma Adı, VKN, Renkli Bakiye Hapı (Borçlu/Alacaklı), 2-sütunlu Borç/Alacak dökümü ve "Hesap Detayı" butonu.
     * 🛠️ **SSH Talepleri (`/m/ssh`):** SSH Kodu, Sipariş No, Perakendeci/Üretici, Durum Rozeti, İncele ve Durum Güncelle aksiyonları.
     * 📦 **İade Talepleri (`/m/iade`):** Sipariş No, Firma Adı, Ürün Adedi, İade Tutarı ve Detay butonu.
     * 🏷️ **Ürün Yönetimi (`/m/urunler`):** Ürün görseli, Model kodu, SET/Pasif rozetleri, sağ üstte Düzenle & Pasife Al butonları, 2 sütunlu Stok/Fiyat/Maliyet/Marj ızgarası.
     * 📊 **Stok Yönetimi (`/m/stok`):** Görsel, Kod, Grup, sağ üstte doğrudan inline düzenlenebilen Stok Giriş Kutusu, Ölçüler ve Özellikler dökümü.
3. **Katlanabilir Rehberler (Collapsible Accordion):**
   * `StockHowToBanner` gibi dikeyde çok yer kaplayan rehber panelleri mobilde sağ üstteki ok ikonuyla **açılır/kapanır akordeon** yapısına geçirilerek ekran alanı verimli kullanılır.
4. **Simetrik Buton Izgarası (Grid-based Action Bar):**
   * Mobilde butonların dağınık görünmemesi için `grid grid-cols-2` ve `grid grid-cols-3` gibi tam dengeli, eşit yükseklikte ve simetrik ızgara blokları kullanılır.

## 6. 🎨 MÜŞTERİ DEĞİŞİKLİK TALEBİ VE FİYAT FARKI YÖNETİMİ

Mobilya sektöründe müşteriler ürünler üzerinde özel değişiklikler (kumaş türü, ayak rengi, özel ölçü, aksesuar çıkarma/ekleme) talep eder. KÖPRÜ bu süreci finansal ve operasyonel olarak tam entegre yönetir:

### A. Alanların Çalışma Mantığı:
1. **Açıklama / Değişiklik Talebi (`custom_description`):**
   * Perakendeci, müşterinin özel talebini girer (Örn: *"Kumaş kadife olsun, ayaklar gold yerine ahşap ceviz olsun"*).
   * Bu talep üreticinin fabrika üretim fişine ve sipariş detayına açıkça basılır.
2. **Fiyat Farkı ₺ (`price_difference`):**
   * **Artı Tutar (`+2.000 TL`):** Değişiklik maliyeti artırıyorsa (ör. lüks kadife kumaş) pozitif yazılır.
   * **Eksi Tutar (`-500 TL`):** Değişiklik maliyeti düşürüyorsa (ör. kırlent çıkarılması) negatif yazılır.
   * **Katman 2 & 3 Entegrasyonu:** Fiyat farkı hem B2B alış fiyatına (`supplier_unit_price + price_difference`) hem de perakende satış fiyatına yansır.

---

### B. Sipariş, İptal ve İade Süreçlerindeki Davranışı:

1. **Sipariş Verildiğinde (Aktif Akış):**
   * Sipariş kalemi `(B2B Birim Fiyatı + Fiyat Farkı) x Adet` formülüyle hesaplanır.
   * Perakendecinin cari hesabına yansıyan **BORÇ (Debit)** tutarı, bu fiyat farkını da içeren net toplam tutardır.
   * Üretici siparişi aldığında değişiklik talebini görerek üretime başlar.

2. **Sipariş İptal Edilirse:**
   * Sipariş iptal edildiğinde, **özel fiyat farkı dahil siparişin tüm toplam tutarı** Perakendecinin cari hesabına **ALACAK (Credit)** olarak geri yazılır ve borç sıfırlanır.
   * Varsa düşülmüş stok miktarı üreticinin envanterine iade edilir.

3. **Ürün İade Edilirse:**
   * Teslimattan sonra hasar, kumaş uyuşmazlığı veya hata sebebiyle İade Talebi açıldığında:
   * İade edilen adedin birim tutarı (özel fiyat farkı dahil) üzerinden hesaplanan iade tutarı, üretici iadeyi kabul ettiği anda Perakendecinin cari hesabına **ALACAK (Credit)** olarak işlenir.

---

## 7. 🛒 SİPARİŞ YAŞAM DÖNGÜSÜ (ORDER LIFECYCLE)

Siparişler, tek bir üreticiye ait ürünleri içeren sepetlerden doğar ve katı bir durum makinesini (State Machine) takip eder:

```
[ Sepet ] ──► (1. Taslak / Onay Bekliyor)
                       │
                       ▼
              (2. İşleme Alındı)
                       │
                       ▼
                (3. Üretimde)
                       │
                       ▼
        (4. Kısmen Sevk Edildi) ──► (5. Sevk Edildi)
                                          │
                                          ▼
                                (6. Teslim Edildi) ★ [Terminal State - Kilitli]
                                          
             [ Herhangi Bir Aşamada ] ──► (İptal Edildi) ★ [Terminal State - Kilitli]
```

### Sipariş Kuralları:
1. **Bir Sipariş = Tek Üretici:** Bir sepette iki farklı üreticinin ürünü bulunamaz. Farklı üreticiden ürün eklenmek istendiğinde sistem kullanıcıyı uyarır ve onay ister.
2. **Terminal Durum Değişmezliği:** `Teslim Edildi` veya `İptal` durumundaki siparişler son durumdur; bu durumdaki sipariş üzerinde artık değişiklik yapılamaz.

---

## 8. 💳 CARİ DEFTER VE FİNANSAL DEĞİŞMEZLİK (APPEND-ONLY LEDGER)

KÖPRÜ'nün finansal omurgası katı muhasebe ve mutabakat kurallarına bağlıdır:

1. **Siparişte Borç (Debit):** Sipariş onaylandığı anda Perakendecinin cari hesabına sipariş tutarı kadar **BORÇ** yazılır.
2. **İptal ve İadede Alacak (Credit):** Sipariş iptal edilirse veya onaylı bir iade gerçekleşirse Perakendeciye **ALACAK** yazılır.
3. **Sevkiyatta ASLA Cari İşlem Yapılmaz:**
   * Kısmi veya tam sevkiyat yapıldığında veritabanına **hiçbir cari kayıt atılmaz**. Sevkiyat sadece lojistik bir durumdur.
4. **Manuel Cari İşlemler ve Çift Taraflı Onay Mekanizması (Kritik Kural):**
   * Gerek Üye Üretici gerekse Üye Perakendeci cari hesaba manuel ekleme/çıkarma (tahsilat, ödeme, masraf, bakiye düzeltme) yapabilir:
     * 🤝 **Karşı Taraf ÜYE ise (Çift Taraflı Onay):** Bir üyenin girdiği manuel cari hareket, karşı tarafın onayına (`onay_bekliyor`) sunulur. Karşı üye onaylamadan cari bakiye kesinleşmez. Böylece iki üye firma arasında mutabakat tam garantiye alınır.
     * 👁️ **Karşı Taraf MİSAFİR ise (Salt İzleme):** Misafir firmaların onay mekanizması yoktur. Sponsor üyenin girdiği cari hareketler doğrudan işler; misafir firma cari defteri **yalnızca izler, ekstre alır ve takip eder**.
5. **Defter Değişmezliği (Append-Only):** `transactions` tablosundaki kayıtlar asla silinemez (`DELETE`) veya güncellenemez (`UPDATE`); düzeltmeler ancak ters kayıt (ters işlem) atılarak yapılır.
6. **Müşteri Carilerinde Kısmi Sevkiyat (Child Orders) Bütünlüğü:**
   * Kısmi sevkiyatlarda oluşan alt siparişler (`parent_order_id` olan çocuk siparişler) ASLA bağımsız birer müşteri carisi açamaz.
   * Tüm alt siparişler, parçası oldukları kök siparişin müşteri carisinde toplanır; böylece tekil cari satırındaki toplam borç ve detay zaman çizelgesindeki (`CustomerLedgerDetail`) tutarlar birebir aynı ve hatasız kalır.

---

## 9. 🛠️ SSH (SATIŞ SONRASI HİZMET) VE İADE SÜREÇLERİ

* **SSH Talebi:**
  * Perakendeci, müşterisine teslim ettiği arızalı/hasarlı ürünler için parça adı, arıza nedeni ve fotoğraf ekleyerek SSH talebi açar.
  * Üretici talebi inceler: `İşleme Alındı`, `Parça Bekleniyor`, `Tamamlandı` veya `İptal` adımlarıyla süreci tamamlar.
  * `Tamamlandı` veya `İptal` durumuna geçen SSH taleplerinde sonradan manipülasyonu önlemek için düzenleme butonları kilitlenir.
* **İade Talebi:**
  * Perakendeci hasarlı veya uyuşmayan ürünler için iade talebi oluşturur.
  * Üretici iadeyi kabul ettiği anda tutar doğrudan cari hesaba alacak olarak geçer ve ürün stoğu yenilenir.

---

## 9. 🛡️ MİSAFİR VE B2B İZOLASYON ZIRHI (PLATFORMUN OMURGA KURALI)

Platformdaki en katı güvenlik ilkesidir:
* **Hiçbir misafir organizasyon (üretici veya perakendeci), kendisini sisteme dahil eden veya giriş yaptığı üye sponsor dışında sistemdeki diğer hiçbir firmanın adını, ürününü, siparişini, cari hesabını veya duyurusunu GÖREMEZ ve DUYAMAZ.**
* **Perakendeci Katalog İzolasyonu:** Perakendeci "Tüm Üreticiler" görünümünde dahi olsa, YALNIZCA aktif tedarikçi ilişkisi (`status = 'active'`) bulunan üreticilerin ürünlerini görebilir. Aktif ilişkisi olmayan hiçbir yabancı üreticinin ürünü asla listelenmez (`TEDARİKÇİ: —` rozetli sahipsiz ürünler tamamen engellenir).
* **Üretici Stok İzolasyonu Kuralı:** Üretici Stok Yönetimi (`/m/stok` / `useStockList`), YALNIZCA oturum açan üreticinin kendi organizasyon ID'sine (`owner_org_id = orgId`) ait ürünleri listeler. Sistemdeki diğer üreticilerin modelleri ASLA bir başka üreticinin stok tablosuna karışamaz.
* **Çift Katmanlı Zırh:** Bu kural yalnız arayüzde değil, veritabanı RLS (Row Level Security), API sorguları ve otomatik test süiti ile de çift taraflı olarak kilitlenmiştir.

---

## 10. 👑 PLATFORM YÖNETİCİSİNİN (ADMİNCYO) ROLÜ

Platform Yöneticisi (`admincyo.localhost` / `admincyo.kopru.com`), ekosistemin hakemi ve orkestra şefidir:
1. **Organizasyon Denetimi:** Yeni kaydolan üretici ve perakendecileri inceler, aktif/pasif durumlarını yönetir.
2. **Abonelik & Paket Yönetimi:** Firmaların üyelik paketlerini (Free, Pro, Enterprise vb.) ve modül erişimlerini (SSH Modülü, İade Modülü, Stok Modülü) tanımlar.
3. **Güvenlik ve Giriş Denetimi:** `login_audit` üzerinden şüpheli giriş denemelerini, kilitlenen hesapları ve IP loglarını izler.
4. **Sistem Sağlığı:** Tüm B2B ilişkilerini, genel ciro hacimlerini ve sistem performansını merkezi gösterge panelinden takip eder.

---

### 📊 Süreç Özeti Akış Şeması:

```
[Üretici Ürünleri Girer] ──► [Perakendeci B2B Kataloğu Görür] ──► [Sepete Ekle & Sipariş Ver]
                                                                          │
       ┌──────────────────────────────────────────────────────────────────┴────────────────────────────────┐
       ▼                                                                                                   ▼
[Cari Deftere BORÇ İşlenir]                                                                   [Stok Miktarı Otomatik Düşer]
       │                                                                                                   │
       ▼                                                                                                   ▼
[Üretici Siparişi Üretime Alır] ──► [Kısmi / Tam Sevkiyat Yapar] ──► [Perakendeci Teslim Alır]      [İptal / İade Olursa]
                                    (Cari İşlem Yapılmaz!)            (Süreç Başarıyla Biter)      (ALACAK Yazılır & Stok Döner)
```

---

## 11. 📱 RESPONSİVE MOBİL AKILLI KART (SMART CARD) & 3D DERİNLİK MİMARİSİ STANDARDI

Platformun mobil kullanıcı deneyimi (UX/UI), masaüstü tablolarının küçük ekranlarda sıkışmasını ve yatay taşmasını önleyen katı bir **Çift Katmanlı Görünüm ve 3D Kart Standardı** ile normalize edilmiştir:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        RESPONSİVE KÖPRÜ TASARIM STANDARDI                       │
├───────────────────────────────────────┬─────────────────────────────────────────┤
│    🖥️ MASAÜSTÜ (md ve üzeri ekranlar)  │    📱 MOBİL (md altı akıllı telefonlar) │
├───────────────────────────────────────┼─────────────────────────────────────────┤
│  • Geniş, çok sütunlu HTML Tablosu    │  • Dokunmatik Akıllı Kartlar (Cards)    │
│  • whitespace-nowrap & hızlı sıralama │  • 2 Sütunlu Tam Simetrik Izgara        │
│  • Tam sayfa veri derinliği           │  • Akordeon Sayaçlar ([Tüm Kartlar ▾])  │
│  • `hidden md:block` kapsayıcısı      │  • `md:hidden` kapsayıcısı              │
└───────────────────────────────────────┴─────────────────────────────────────────┘
```

### 💎 Platformun 3 Boyutlu Kart Standardı (3D Elevation & Defined Border):
* **Belirgin ve Keskin Kenarlık:** `border border-slate-200/90 ring-1 ring-slate-900/[0.04]` kombinasyonu ile kartların sınırları arka plandan net şekilde ayrılır.
* **Derinlikli Katmanlı Mikro Gölge:** `shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)]` sayesinde kartlar ekranda düz dikdörtgen değil, hafifçe yükseltilmiş premium bir derinlikte durur.
* **Dokunsal Etkileşim:** `hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/80 transition-all` ile dokunulduğunda veya üzerine gelindiğinde yumuşak bir yükselme hareketi sunar.

### 📱 Modül Bazlı Mobil Kart Standartları:
1. **Ürün Yönetimi (`ProductTable`, `RetailerProductTable`):**
   * Mobilde görsel, SET rozeti, ürün kodu, kategori, dinamik stok durumu, tedarikçi alış fiyatı ve tek dokunuşla yerinde düzenlenen satış fiyatı alanı.
2. **Sipariş, İade ve SSH Kartları (`OrderTable`, `ReturnList`, `SshList`):**
   * **Tam Simetri Kuralı:** Sağ sütundaki veriler (Son Müşteri, Talep Tarihi, Net Tutar) tek bir dikey çizgide kusursuz alt alta hizalanır.
3. **Alışveriş Sepeti (`CartLinesTable`):**
   * Modern mobil e-ticaret mimarisi: Sol üstte 80x80px görsel, çift satır başlık, sağ üstte sil butonu, alt sırada geniş parmak dostu adet stepper'ı (`[ − ] [ 4 ] [ + ]`) ve büyük satır toplamı.
4. **Finans & Kasa Yönetimi (`FinanceTxTable`, `CustomerLedgerTable`, `CustomerLedgerDetail`):**
   * Kasa ve POS hareketleri yeşil/kırmızı tutar ve anlık bakiye rozetleriyle kartlaşır.
   * Müşteri Carileri sekmesinde kart içi `[Detay Aç ▼]` akordeonu ile hesap hareketleri zaman çizelgesi alt alta mini işlem kartları olarak açılır.
5. **Akordeonlu Sayaç Kartları (`ProductStatCards`, `ReportKpiCards`, `ProfitabilityTab`):**
   * Mobilde 4 kartın üst üste yığılmasını önlemek için varsayılan olarak yalnız 1 ana kart gösterilir; sağındaki `[Tüm Kartlar ▾]` butonu ile diğer kartlar pürüzsüzce genişletilip özetlenebilir.
6. **Yönetilen Misafir Üretici Stok RPC Güvencesi (`set_retailer_stock`):**
   * Perakendecinin kataloğunu yönettiği misafir üretici ürünleri (`is_active = false`) için de stok güncellemeleri veritabanı düzeyinde tam desteklenir.
7. **Sipariş Detayı Kalem Kartları (`OrderItemsCard`):**
   * Sipariş detayında mobilde yatay kaydırma çubuğu ve rakam çakışmasını önlemek için 5 sütunlu tablo yerine ferah mobil ürün kartları (`md:hidden`) uygulanır; üstte ürün adı ve miktar rozeti, altta birim fiyat ve satır toplamı tam simetrik olarak yerleşir.
8. **Kısmi Sevkiyat Listesi Düzeni (`OrderExpandedDetail`):**
   * Sipariş detayındaki kısmi sevkiyat satırlarında mobilde tutar ve rozet çakışmasını engellemek için 2 satırlı dengeli ızgara mimarisi uygulanır: Üstte Sevk No + Tutar, altta Oluşturulma Zamanı + Sevkiyatta Rozeti.
9. **Cari & Finans Ekstre Tarih Filtresi (`PeriodBar`):**
   * Ekstre filtreleme kutuları (`Başlangıç` ve `Bitiş`) mobilde dikey alan israfını önlemek için `grid-cols-2` ile yan yana yerleşir. Hızlı dönem butonlarına `[Bu ay]`, `[Geçen ay]` yanına tek tıkla tüm takvim yılını seçen **`[Bu yıl]`** (1 Ocak – 31 Aralık) butonu entegre edilmiştir.
10. **Kırılmaz Yan Yana Sayfalama Standartı (`Pagination`, `LedgerTable`):**
    * Mobilde sayfa numarası ve önceki/sonraki yönlendirme butonları `flex-nowrap`, `shrink-0` ve `whitespace-nowrap` ile daima tek satırda yan yana kilitlenir; hiçbir ekran genişliğinde alt alta kırılmaz.
11. **Cari Hesaplar Tablosunda ÜYE / MİSAFİR Ayrımı (`AccountsTable`, `AccountDetailDialog`):**
    * Cari hesaplar ana listesinde (`/m/cari` ve `/r/cari`) ve mobil akıllı kartlarda, Firma Adı'nın hemen yanında karşı tarafın kurumsal statüsü belirgin rozetlerle gösterilir:
      * **Abone Firma:** Mavi **`ÜYE`** rozeti (`bg-blue-50 text-blue-700 border border-blue-200`).
      * **Misafir Firma:** Nötr gri **`MİSAFİR`** rozeti (`bg-slate-100 text-slate-600 border border-slate-200`).
    * Cari Hesap Detayı ve Ekstre modal başlığında da bu statü rozeti eksiksiz yer alır.

---

## 12. 🎯 ADAY YÖNETİMİ (LEADS) VE TEK TIKLA ÜYE DÖNÜŞTÜRME MİMARİSİ (`/admin/adaylar`)

Platformun büyüme ve müşteri kazanım sürecini yöneten Aday (Lead) sistemi:

1. **Aday Toplama Kanalları:**
   * Giriş (Landing) sayfasındaki akordeon başvuru formları (`LeadApplicationModal`) üzerinden veya doğrudan WhatsApp üzerinden gelen potansiyel üretici ve perakendeci başvuruları veritabanı `leads` tablosuna kaydedilir.
2. **Platform Admini Denetim Paneli (`AdminLeadsPage`):**
   * Yalnızca Platform Yöneticisi (`admincyo`) tarafından görüntülenir.
   * Durum filtreleri: `Tümü`, `Yeni`, `Arandı`, `İlgileniyor`, `Müşteri Oldu` (`converted`), `Olumsuz` (`rejected`).
3. **Tek Tıkla Üyeye Dönüştürme (`+ Üretici Ekle` / `+ Perakendeci Ekle`):**
   * Aday başvurusunda girilen **Firma Adı, VKN/TCKN, İl/İlçe, Telefon ve E-posta** bilgileri `CreateOrgDialog` formuna otomatik olarak aktarılır.
   * Admin "Oluştur" butonuna bastığı anda organizasyon sisteme **tam yetkili Üye (is_subscriber: true)** olarak açılır.
4. **Otomatik Müşteri Eşitlemesi (Trigger & State):**
   * `organizations_match_lead` veritabanı trigger'ı ve arayüz mutasyonu sayesinde, organizasyonu açılan adayın durumu anında yeşil **"Müşteri Oldu (✓ Sisteme Kayıtlı)"** rozetine dönüştürülür.

---

## 13. 💎 GİRİŞ (AUTH & LANDING) MİMARİSİ, TİPOGRAFİ STANDARDI VE MOBİL WHATSAPP PROTOKOLÜ

Giriş ve karşılama ekranının teknik standartları:

1. **Aydınlık SaaS Görünümü:**
   * Yumuşak arka plan (`bg-slate-100/70`), derinlikli beyaz kartlar (`shadow-xl shadow-slate-200/60`), dengeli kontrast ve ortam ışığı gradyanları.
2. **Tek Kolon Dikey Merkezli Düzen:**
   * Desktop ve mobilde eşit, derli toplu dikey hiyerarşi: Üstte Üye Üretici Başvuru Akordeonu, Ortada 5 sekmeli Giriş Kartı, Altta Üye Perakendeci Başvuru Akordeonu.
3. **Rol Bazlı Renk Ayrımı & Derin Gece Laciverti:**
   * **Üretici Başvuru Banner'ı:** Sıcak Kiremit Turuncusu (`#d96b43` / `#c25730` / `bg-orange-50/70`).
   * **Mağaza Başvuru Banner'ı:** Zümrüt Yeşili (`emerald-700` / `bg-emerald-50/60`).
   * **Giriş Formu & Giriş Yap Butonu:** Derin Gece Laciverti (`#0f172b`). Input odak halkaları ve aktif sekme vurgusu bu asil tona bağlanmıştır.
4. **Dokunsal 3D Yükseltme & Basılabilir Buton (Tactile 3D Push Action):**
   * **3D Kart Gövdesi:** Katmanlı gölge (`shadow-[0_20px_50px_-12px_rgba(15,23,43,0.18)]`) ve üst kenar mikro beyaz ışık çizgisi.
   * **Gömülü Giriş Kutuları:** İç gölgeli (`shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)]`) oyuk alanlar.
   * **3D "Giriş Yap" Butonu:** Üst kenarda parlak pah (`border-t border-white/25`), alt kenarda 2px koyu taban derinliği (`border-b-2 border-b-[#050811]`), basıldığında içeri çöken (`active:translate-y-1`) gerçekçi mekanik buton hissi.
5. **Dışa Tıklamada Kapanan Akordeonlar (Click Outside):**
   * Üretici veya Mağaza başvuru akordeonları açıkken sayfanın herhangi bir yerine (giriş kartı, arka plan, butonlar) tıklandığında veya dokunulduğunda (`mousedown` & `touchstart`) açık olan panel kendiliğinden kapanır.
6. **Sıfır Taşmalı Mobil Sekme Başlıkları ("MAĞAZA" Terminolojisi):**
   * Küçük mobil ekranlarda (320px–375px) 11 harfli `PERAKENDECİ` kelimesinin kesilmesini ve taşmasını önlemek amacıyla sektöre tam uygun **`ÜYE MAĞAZA`** ve **`MİSAFİR MAĞAZA`** ifadelerine geçilmiştir.
7. **Yeni Nesil SaaS Tipografisi (Plus Jakarta Sans & Inter):**
   * Modern SaaS standardı **Plus Jakarta Sans Variable** ve **Inter Variable** aileleri; Türkçe karakterler (`İ`, `Ş`, `Ğ`, `Ü`, `Ö`, `Ç`) için pürüzsüz estetik görünüm.
8. **Evrensel Mobil WhatsApp Derin Bağlantısı (`buildWhatsAppLink`):**
   * `src/lib/whatsapp.ts` içindeki akıllı cihaz tespiti sayesinde:
     * **Mobilde:** `api.whatsapp.com/send` protokolü çağrılarak tarayıcı ara ekranı bypass edilir ve doğrudan **telefondaki yerel WhatsApp uygulaması** açılır.
     * **Masaüstünde:** Doğrudan WhatsApp Web tarayıcı sohbeti açılır.
   * Başvuru formu gönderildiğinde ve WhatsApp açıldığında, onay penceresinde gereksiz tekrarları önlemek adına tek bir şık **"Kapat"** butonu yer alır.

---

## 14. 🚚 NİHAİ MÜŞTERİYE TESLİMAT & MONTAJ RANDEVUSU MİMARİSİ (`CustomerDeliveryModal`)

Fabrikadan mağazaya teslim edilen (`status = 'delivered'`) mobilya siparişlerinin son tüketiciye ulaştırılma sürecini yöneten operasyonel akış:

1. **Mağaza Paneli Sipariş Tablosu Entegrasyonu (`OrderTable`):**
   * Perakendeci görünümünde (`/r/siparisler`), `DURUM` ile `İŞLEMLER` arasına **Müşteri Sevkiyatı** sütunu eklenmiştir.
   * Sipariş mağazaya ulaştığında yeşil **`🚚 Teslimat Başlat`** butonu belirir; randevu planlandığında ise mavi **`📅 02 Eyl (14:00 - 18:00)`** rozeti olarak güncellenir ve tekrar tıklanarak düzenlenebilir.
2. **Kapsamlı Randevu ve Adres Düzenleme Modalı (`CustomerDeliveryModal`):**
   * **İletişim & Adres:** Siparişten hazır gelen Müşteri Adı, Telefonu ve Açık Adresi mağaza yetkilisi tarafından doğrudan form üzerinden güncellenebilir (Veritabanında `orders` tablosuna da yansır).
   * **Tarih & Saat:** Takvimden teslimat günü ve hazır saat dilimleri (`09:00 - 12:00`, `13:00 - 17:00`, `17:00 - 21:00` veya özel saat) seçilir.
   * **Kısmi Teslimat Desteği:** Varsayılan olarak tüm ürünler ve tam adetleri seçili gelir; istenirse kalem bazında adet stepper'ı (`[ − ] [ 1 ] [ + ]`) ile kısmi teslimat ayrıştırılabilir.
   * **Montaj Notu:** Kat, asansör veya bina girişine dair ekibe özel notlar girilebilir.
3. **Tek Tıkla WhatsApp Randevu Bildirimi:**
   * Modal içindeki **`💬 WhatsApp Randevu Bildirimi`** butonu sayesinde müşteriye tek tıkla teslimat günü, saat aralığı ve adres bilgilerini içeren şık ve kurumsal bir randevu mesajı iletilir.
4. **Canlı Müşteri Sipariş Takip Linki Entegrasyonu (`TrackOrderView` & `/takip/:token`):**
   * Mağaza teslimatı planladığı anda son müşterinin takip ekranında en üstte belirgin yeşil/mavi **`🚚 Evinize Teslimat & Montaj Planlandı`** kartı açılır; tarih, saat aralığı, güncel adres ve montaj notları müşteriye şeffafça sunulur. Zaman çizelgesine de log olarak işlenir.
