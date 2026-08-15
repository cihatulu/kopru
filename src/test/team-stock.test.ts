/**
 * Ekip ve stok — şema tarafı garantileri.
 *
 * Buradaki korumaların ikisi kilitlenmeye, ikisi yetki aşımına karşı:
 * sahibin kendini dışarıda bırakması, personelin kapsamsız her şeyi görmesi,
 * istemcinin stoğa doğrudan yazması, CSV'ye yabancı ürün kimliği yazılması.
 */
import { describe, expect, test } from 'vitest';
import { functionBody, loadMigrationSql, policiesFor } from './sqlSchema';

const sql = loadMigrationSql();

describe('personel yetkisi', () => {
  test('rol ve durum değişimi yalnız SAHİP tarafından yapılır', () => {
    for (const fn of ['set_staff_role', 'set_staff_active', 'set_staff_scope']) {
      const body = functionBody(fn);
      expect(body, `${fn} boş`).not.toBe('');
      expect(body).toMatch(/get_my_org_role\(\) <> 'owner'/i);
      expect(body).toMatch(/FORBIDDEN/);
    }
  });

  test('sahip kendi rolünü düşüremez', () => {
    // Düşürebilseydi org sahipsiz kalırdı: kimse personel ekleyemez, kimse geri alamaz.
    expect(functionBody('set_staff_role')).toMatch(/CANNOT_CHANGE_OWN_ROLE/);
  });

  test('sahip kendini pasifleştiremez', () => {
    expect(functionBody('set_staff_active')).toMatch(/CANNOT_DEACTIVATE_SELF/);
  });

  test('yalnız kendi organizasyonunun kullanıcısına dokunulur', () => {
    for (const fn of ['set_staff_role', 'set_staff_active']) {
      expect(functionBody(fn)).toMatch(/org_id = v_me/i);
    }
  });

  test('pasifleşen personelin kapsamı düşer', () => {
    // Geri açıldığında eski müşterilere sessizce erişmesin.
    const body = functionBody('set_staff_active');
    expect(body).toMatch(/if not p_is_active then[\s\S]*?delete from public\.staff_scope/i);
  });

  test('silme değil pasifleştirme yapılır (kilitli kural 16)', () => {
    const body = functionBody('set_staff_active');
    expect(body).toMatch(/update public\.users set is_active/i);
    expect(body).not.toMatch(/delete from public\.users/i);
  });
});

describe('personel kapsamı', () => {
  test('yalnız GERÇEKTEN ilişkimiz olan perakendeci atanabilir', () => {
    // Aksi halde personele, org'un kendisinin bile göremediği müşteri verilebilirdi.
    const body = functionBody('set_staff_scope');
    expect(body).toMatch(/from public\.relationships r[\s\S]*?r\.manufacturer_org_id = v_me/i);
  });

  test('kapsam tümüyle değiştirilir — kısmi birleşme olmaz', () => {
    const body = functionBody('set_staff_scope');
    expect(body).toMatch(/delete from public\.staff_scope where staff_user_id/i);
  });

  test('personel kendi kapsamını görebilir, başkasınınkini göremez', () => {
    const policies = policiesFor('staff_scope');
    const selfRead = policies.find((p) => /staff_scope_self_read/i.test(p));
    expect(selfRead).toMatch(/staff_user_id = \(select public\.get_my_user_id\(\)\)/i);
  });
});

describe('stok yazımı (kilitli kural 14)', () => {
  test('manufacturer_stock tablosunda INSERT/UPDATE politikası YOK', () => {
    // İstemci bu tabloya asla doğrudan yazmaz; tek yol atomik RPC veya Edge Function.
    const policies = policiesFor('manufacturer_stock');
    for (const p of policies) {
      expect(p).not.toMatch(/for (insert|update|all)\b/i);
    }
  });

  test('set_product_stock yalnız ÜRETİCİ tarafından çağrılabilir', () => {
    const body = functionBody('set_product_stock');
    expect(body).toMatch(/get_my_org_kind\(\) <> 'manufacturer'/i);
    expect(body).toMatch(/FORBIDDEN/);
  });

  test('muhasebeci stok değiştiremez', () => {
    expect(functionBody('set_product_stock')).toMatch(
      /get_my_org_role\(\) not in \('owner', 'staff'\)/i,
    );
  });

  test('negatif stok reddedilir', () => {
    expect(functionBody('set_product_stock')).toMatch(/INVALID_QUANTITY/);
  });

  test('yalnız kendi ürününün stoğu yazılabilir', () => {
    const body = functionBody('set_product_stock');
    expect(body).toMatch(/p\.owner_org_id = v_me/i);
    expect(body).toMatch(/PRODUCT_NOT_FOUND/);
  });
});

describe('toplu stok güncelleme', () => {
  const body = functionBody('bulk_update_stock');

  test('yabancı ürün kimliği atlanır', () => {
    // CSV'ye başkasının ürün id'sini yazmak stoğuna dokunmaya yetmemeli.
    expect(body).toMatch(/p\.owner_org_id = v_me[\s\S]*?continue;/i);
  });

  test('negatif ve boş değerler atlanır', () => {
    expect(body).toMatch(/v_qty < 0/);
  });

  test('güncellenen ve oluşturulan sayısı AYRI döner', () => {
    // Kullanıcıya "gönderdiğin satır" değil, sunucunun gerçekten yaptığı iş
    // gösterilir; yeni ürün açılması ayrıca görünmek zorunda.
    expect(body).toMatch(/jsonb_build_object\('updated', v_updated, 'created', v_created\)/i);
  });

  test('dizi olmayan yük reddedilir', () => {
    expect(body).toMatch(/INVALID_PAYLOAD/);
  });
});

describe('Excel tanınmayan satırdan PASİF ürün doğurur', () => {
  const body = functionBody('bulk_update_stock');

  test('kimliksiz satır için ürün oluşturulur', () => {
    expect(body).toMatch(/if v_product_id is null then[\s\S]*?insert into public\.products/i);
  });

  test('ÜRETİLMİŞ kolona yazılmaz', () => {
    // `products.owner_kind` GENERATED ALWAYS'tir; INSERT'e yazmak 428C9 verir
    // ve toplu yükleme 400 ile düşer. Üretilen TS tipleri bunu ayırt etmediği
    // için tip kontrolü yakalamaz — bu yüzden testle kilitlendi.
    const insert = /insert into public\.products[\s\S]*?values/i.exec(body)?.[0] ?? '';
    expect(insert).not.toBe('');
    expect(insert).not.toMatch(/owner_kind/i);
  });

  test('ürün PASİF ve fiyatı SIFIR doğar', () => {
    // supplier_price KATMAN 2'dir; sıfır fiyatlı ürün sipariş edilebilseydi
    // cari bozulurdu. Pasiflik bu yüzden güvenlik kilidi.
    expect(body).toMatch(/values\s*\([\s\S]*?0,\s*false\s*\)/i);
    expect(body).toMatch(/is_active\s*\)/i);
  });

  test('adı olmayan satırdan ürün DOĞMAZ', () => {
    expect(body).toMatch(/if v_name is null then[\s\S]*?continue;/i);
  });

  test('dolu ama yabancı kimlik ürün DOĞURMAZ — atlanır', () => {
    // Başkasının kimliğiyle ürün doğurmak, o kimliğin varlığını da doğrulardı.
    const elseBranch = body.slice(body.indexOf('else'));
    expect(elseBranch).toMatch(/owner_org_id = v_me[\s\S]*?continue;/i);
    expect(elseBranch).not.toMatch(/insert into public\.products/i);
  });

  test('pasif ürün sipariş edilemez — sunucu tarafı hâlâ şart koşuyor', () => {
    // Bayat bir sepetten bile geçmemeli.
    expect(functionBody('place_order_atomic')).toMatch(/and is_active/i);
  });
});

describe('stok tutma hakkı ÜYE tarafındır', () => {
  test('misafir perakendeci kendi deposunu tutamaz', () => {
    // Yalnız tedarikçisinin stoğunu GÖRÜR. Menüyü gizlemek birinci katman;
    // bu ikinci katman (kilitli kural 15).
    for (const fn of ['set_retailer_stock', 'bulk_update_retailer_stock']) {
      const body = functionBody(fn);
      expect(body, `${fn} boş`).not.toBe('');
      expect(body).toMatch(/not public\.get_my_org_is_subscriber\(\)/i);
      expect(body).toMatch(/STOCK_NOT_ALLOWED/);
    }
  });

  test('misafir üretici yalnız ÜRÜN YÖNETİMİ izniyle stok tutar', () => {
    for (const fn of ['set_product_stock', 'bulk_update_stock']) {
      const body = functionBody(fn);
      expect(body).toMatch(/not public\.manufacturer_may_write_stock\(\)/i);
      expect(body).toMatch(/STOCK_NOT_ALLOWED/);
    }
  });

  test('izin anahtarı aktif ilişkide can_edit_catalog üzerinden okunur', () => {
    const body = functionBody('manufacturer_may_write_stock');
    expect(body).toMatch(/get_my_org_is_subscriber\(\)/i);
    expect(body).toMatch(/r\.can_edit_catalog/i);
    expect(body).toMatch(/r\.status = 'active'/i);
    // A9: denormalize kolon üzerinden eşitlik; alt sorguyla ilişki kimliği toplanmaz.
    expect(body).toMatch(/r\.manufacturer_org_id = public\.get_my_org_id\(\)/i);
    expect(body).not.toMatch(/relationship_id in \(/i);
  });

  test('perakendecinin kendi deposu hiçbir üreticiye görünmez', () => {
    // retailer_stock yalnız sahibine açık; ne üye ne misafir üretici okuyabilir.
    const policies = policiesFor('retailer_stock');
    for (const p of policies) {
      expect(p).not.toMatch(/manufacturer_org_id/i);
    }
    expect(policies.join('\n')).toMatch(
      /retailer_org_id = \(select public\.get_my_org_id\(\)\)/i,
    );
  });
});

describe('perakendeci Excel ile yeni üreticinin ürünlerini açar', () => {
  const body = functionBody('bulk_update_retailer_stock');

  test('yeni ürünler SEÇİLEN üreticinin kataloğuna yazılır', () => {
    expect(body).toMatch(/insert into public\.products[\s\S]*?p_manufacturer_org_id/i);
  });

  test('yetki save_product ile aynı üç koşulu arar', () => {
    // Liste sunucunun kabul edeceğinden geniş olursa kullanıcı üreticiyi seçer,
    // sonra "yetkiniz yok" hatası alır.
    expect(body).toMatch(/r\.status = 'active'/i);
    expect(body).toMatch(/r\.can_edit_catalog/i);
    expect(body).toMatch(/o\.is_subscriber = false/i);
  });

  test('üretici seçilmeden yeni ürün açılamaz — sessizce atlanmaz', () => {
    expect(body).toMatch(/MANUFACTURER_REQUIRED/);
  });

  test('yetkisiz üretici seçilirse reddedilir', () => {
    expect(body).toMatch(/CATALOG_NOT_ALLOWED/);
  });

  test('ÜRETİLMİŞ kolona yazılmaz', () => {
    // `retailer_stock.retailer_kind` GENERATED ALWAYS'tir. Eski sürüm ona elle
    // yazdığı için perakendeci stok yazma yolu HİÇ çalışmamıştı.
    for (const fn of ['set_retailer_stock', 'bulk_update_retailer_stock']) {
      const insert = /insert into public\.retailer_stock[^)]*\)/i.exec(functionBody(fn))?.[0] ?? '';
      expect(insert, `${fn} INSERT bulunamadı`).not.toBe('');
      expect(insert).not.toMatch(/retailer_kind/i);
    }
  });
});

describe('search_path sabitlenmiş (kilitli kural 4)', () => {
  for (const fn of ['set_staff_role', 'set_staff_active', 'set_product_stock']) {
    test(`${fn}`, () => {
      expect(sql).toMatch(
        new RegExp(
          `create or replace function public\\.${fn}[\\s\\S]*?set search_path = public`,
          'i',
        ),
      );
    });
  }
});
