/**
 * Misafir üretici kataloğu: perakendeci kapsamı ve üyelikte birleştirme.
 *
 * Buradaki kurallar VERİ KAYBIYLA sonuçlanabilecek türden. Özellikle
 * birleştirme sırası: kopya ürün, kendisine bağlı sipariş satırları hayatta
 * kalan ürüne taşınmadan silinirse `ON DELETE SET NULL` devreye girer ve
 * sipariş geçmişi ürün bağını SESSİZCE kaybeder. Hata ekranda görünmez,
 * yalnız eski siparişlerde ürün adı kaybolur.
 */
import { loadMigrationSql, functionBody } from './sqlSchema';

const sql = loadMigrationSql();

describe('ürün kapsamı — perakendeci başına ayrım', () => {
  test('products tablosunda managed_by_retailer_org_id var', () => {
    expect(sql).toMatch(/add column if not exists managed_by_retailer_org_id uuid/i);
  });

  test('kapsam kuralı TEK fonksiyonda toplanır', () => {
    // Aynı kural hem RLS'te hem RPC'de ayrı ayrı yazılsaydı er geç ayrışırdı;
    // bu projede `can_edit_catalog` ile tam olarak bu yaşandı.
    expect(functionBody('product_in_my_scope').length).toBeGreaterThan(0);
  });

  const scope = functionBody('product_in_my_scope');

  test('üreticinin kendi ürünü (null) kapsam dışı bırakılmaz', () => {
    expect(scope).toMatch(/p_managed_by is null/i);
  });

  test('ÜYE üretici kataloğunun tamamını görür', () => {
    // Misafirken perakendecilerin onun adına girdiği ürünler üye olunca
    // kendisine açılmalı — istenen davranışın kalbi bu.
    expect(scope).toMatch(/get_my_org_kind\(\)\s*=\s*'manufacturer'/i);
    expect(scope).toMatch(/get_my_org_is_subscriber\(\)/i);
  });

  test('misafir üretici SPONSOR kapsamıyla sınırlı', () => {
    expect(scope).toMatch(/get_my_sponsor_org_id\(\)/i);
  });

  test('save_product ürünü ekleyen perakendeciye yazar', () => {
    expect(functionBody('save_product')).toMatch(
      /case when v_owner <> v_me then v_me else null end/i,
    );
  });

  test('delete_product_permanently kapsam dışı ürünü silmez', () => {
    expect(functionBody('delete_product_permanently')).toMatch(/product_in_my_scope/i);
  });

  test('YAZMA politikaları da kapsam koşulu taşır', () => {
    /*
      YAŞANAN HATA — RLS'in en sinsi tuzağı.

      Kapsamlı SELECT politikaları doğru yazılmıştı, kapsam fonksiyonu doğru
      cevap veriyordu, veri doğruydu. Buna rağmen misafir üretici bütün
      perakendecilerin ürünlerini görüyordu.

      Sebep iki kuralın birleşimi:
        1. `FOR ALL` politikasının USING ifadesi SELECT'e DE uygulanır.
        2. Aynı komut için birden çok PERMISSIVE politika OR'lanır.

      `products_write_owner` yalnız `owner_org_id = benim org` diyordu.
      Misafir üretici kendi ürünlerinin sahibi olduğu için bu koşul her
      satırda geçiyor ve SELECT politikasındaki kapsam koşulunu tamamen
      devre dışı bırakıyordu. Bir YAZMA politikası, farkında olmadan
      okuma izni veriyordu.

      Bu testin işi, yazma politikasının kapsam koşulunu kaybetmesini
      engellemek. Kaybederse sızıntı sessizce geri gelir.
    */
    const yazma = sql.slice(sql.indexOf('create policy products_write_owner'));
    expect(yazma).toMatch(/product_in_my_scope/i);

    const grupYazma = sql.slice(sql.indexOf('create policy product_groups_write_owner'));
    expect(grupYazma).toMatch(/product_in_my_scope/i);
  });

  test('ürün GRUPLARI da perakendeci başına ayrılır', () => {
    // Ürünler ayrıldı ama gruplar atlandığında ekranda şu görüldü: yeni
    // perakendeci diğerinin ürünlerini göremiyor ama sol menüde onun grup
    // adını görüyor — üstelik grup boş, ölü bir düğüm.
    expect(sql).toMatch(
      /alter table public\.product_groups\s+add column if not exists managed_by_retailer_org_id/i,
    );
    expect(functionBody('save_product_group')).toMatch(/product_in_my_scope/i);
    expect(functionBody('delete_product_group')).toMatch(/product_in_my_scope/i);
  });
});

describe('birleştirme — üyeliğe geçişte', () => {
  const merge = functionBody('merge_duplicate_products');

  test('fonksiyon mevcut', () => {
    expect(merge.length).toBeGreaterThan(0);
  });

  test('eşleşme ürün ADIYLA yapılır, koda göre değil', () => {
    // Karar bilinçli: "Alanya Köşe" ile "Alanya Köşe Takımı" AYRI kalmalı.
    expect(merge).toMatch(/partition by btrim\(p\.name\)/i);
  });

  test('hayatta kalan EN ESKİ üründür', () => {
    expect(merge).toMatch(/order by p\.created_at, p\.id/i);
  });

  test('SİPARİŞ GEÇMİŞİ kopyalar silinmeden ÖNCE taşınır', () => {
    // Bu testin tek işi sırayı korumak. `order_items` ürüne ON DELETE SET
    // NULL ile bağlı: silme önce gelirse geçmiş ürün bağını kaybeder ve
    // bu geri alınamaz.
    const tasima = merge.search(/update public\.order_items/i);
    const silme = merge.search(/delete from public\.products p using/i);
    expect(tasima).toBeGreaterThan(-1);
    expect(silme).toBeGreaterThan(-1);
    expect(tasima).toBeLessThan(silme);
  });

  test('SSH kayıtları da silmeden önce taşınır', () => {
    const tasima = merge.search(/update public\.ssh_requests/i);
    const silme = merge.search(/delete from public\.products p using/i);
    expect(tasima).toBeGreaterThan(-1);
    expect(tasima).toBeLessThan(silme);
  });

  test('set içeriğindeki ürün kimlikleri de çevrilir', () => {
    // Çevrilmezse set takımı, artık var olmayan bir ürüne işaret eder.
    expect(merge).toMatch(/jsonb_set\(satir\.value, '\{product_id\}'/i);
  });

  test('stok adetleri TOPLANIR, üzerine yazılmaz', () => {
    expect(merge).toMatch(/quantity = k\.quantity \+ t\.toplam/i);
  });

  test('farklı fiyat varsa üreticiye uyarı bırakılır', () => {
    expect(merge).toMatch(/price_review_needed = true/i);
    expect(merge).toMatch(/supplier_price is distinct from/i);
  });

  test('birleştirme üyeliğe geçişle AYNI transaction içinde çağrılır', () => {
    // Ayrı çağrı olsaydı yarım kalabilir: üretici hem kendi kataloğunu
    // göremez hem kopyalar durur.
    expect(functionBody('upgrade_org_to_subscriber')).toMatch(
      /merge_duplicate_products\(p_org_id\)/i,
    );
  });

  test('kapsam sınırı üyelikle birlikte kalkar', () => {
    expect(merge).toMatch(/set\s+managed_by_retailer_org_id = null/i);
  });
});
