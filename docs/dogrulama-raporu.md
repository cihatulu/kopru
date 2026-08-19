# KÖPRÜ — üretim benzeri doğrulama raporu

> **Durum:** koşu sürüyor. Ölçüm tabloları koşu bitince doldurulacak.
> Bu dosyanın yöntem bölümleri kesindir; sayılar geçicidir.

**Tarih:** 16 Ağustos 2026
**Ölçek:** 50 üye üretici + 50 üye perakendeci + 100 misafir üretici + 100 misafir perakendeci
**Karar:** bu koşu kod değiştirmez. Bulunan her kusur envantere işlenir; düzeltme ayrı işin konusudur.

---

## 1. Yöntem

### Neden gerçek oturum

Her yazma işlemi gerçek bir kullanıcı jetonuyla ve gerçek RPC'den geçti. Service role yalnız iki
yerde kullanıldı: **kurulum** (org ve auth kullanıcısı açmanın kullanıcı-yüzlü bir RPC'si yok) ve
**denetim okumaları** (RLS'i bypass ederek gerçeği görmek).

Bu ayrım keyfi değil. Service role'de `auth.uid()` ve `get_my_org_id()` NULL döner. Birçok RPC'nin
yetki kapısı `if v_rel.retailer_org_id <> v_me then raise` biçiminde; `v_me` NULL olduğunda ifade
NULL üretir ve `if` bunu FALSE sayar — yani kapı hiç çalınmaz. Service role ile yazan bir test,
tam olarak test etmesi gereken şeyi atlar.

### Neden org başına ajan değil

100 perakendeci ve 100 üretici için ayrı ajan görevlendirmek, aynı şemayı ve aynı kuralları 200 kez
baştan öğrenmek ve birbirinin kopyası 200 rapor üretmek demekti. Ayrıca ajanlar tek bir veritabanı
oturumunu paylaşamaz, aralarında sıra kuramaz. Bölme **modül ekseninde** yapıldı: her denetçi
bütün 100 org'u kendi alanında inceledi, alanlar çakışmadı.

### Örnekleme yapılan tek yer

Misafir oturumları. `login` Edge Function'ı her başarılı misafir girişinde
`app_metadata.sponsor_org_id` alanının **üzerine yazıyor** — alan tekil. Bu yüzden misafir girişleri
seri yürümek zorunda ve pahalı. Kapsam denetimi, bütün misafirler aynı kodu ve aynı politikaları
paylaştığı için örneklem üzerinden yapıldı; kaç oturumun denendiği her bulguda yazılı.

### Kendi cari oracle'ı neden yazıldı

`isSummaryConsistent` bir doğrulama gibi duruyor ama `closing` zaten `opening + debit − credit` ile
**türetiliyor**; yani tanımı gereği her zaman `true`. Oracle olarak kullanılamaz (K15). Rapordaki
altı cari değişmezi satırların kendisinden bağımsız olarak, betikte elle hesaplandı.

---

## 2. Sonuç özeti

_(koşu bitince doldurulacak)_

---

## 3. Kusur envanteri

_(koşu bitince doldurulacak)_

---

## 4. Ölçek gözlemleri

_(koşu bitince doldurulacak)_

---

## 5. Öneriler

_(koşu bitince doldurulacak)_
