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

  test('işlenen satır sayısı döner', () => {
    // Kullanıcıya "gönderdiğin satır" değil "işlenen satır" gösterilir.
    expect(body).toMatch(/v_count := v_count \+ 1/);
    expect(body).toMatch(/return v_count/);
  });

  test('dizi olmayan yük reddedilir', () => {
    expect(body).toMatch(/INVALID_PAYLOAD/);
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
