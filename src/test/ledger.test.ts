/**
 * Faz 6 — sipariş ve cari defterin şema garantileri.
 *
 * Bu kurallar muhasebe denetlenebilirliğinin temeli. Bozulurlarsa ya bakiye
 * yanlış hesaplanır ya da geçmiş kayıt sessizce değişir — ikisi de fark
 * edilmesi çok geç olan hatalardır.
 */
import { describe, expect, test } from 'vitest';
import { loadMigrationSql, policiesFor, schemaFromMigrations } from './sqlSchema';

const sql = loadMigrationSql();
const schema = schemaFromMigrations();
const cols = (t: string) => [...(schema.get(t) ?? [])];

function fnBody(name: string): string {
  return (
    new RegExp(
      `create or replace function public\\.${name}[\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$;`,
      'i',
    ).exec(sql)?.[1] ?? ''
  );
}

describe('sipariş şeması — üç fiyat katmanı (A4)', () => {
  test('order_items yalnız KATMAN 2 fiyatını taşır', () => {
    const c = cols('order_items');
    expect(c).toContain('supplier_unit_price');
    expect(c).not.toContain('retail_unit_price');
    expect(c).not.toContain('cost_price');
  });

  test('KATMAN 3 ayrı tabloda ve sahibi denormalize', () => {
    expect(schema.has('order_item_retail_prices')).toBe(true);
    expect(cols('order_item_retail_prices')).toContain('retail_unit_price');
    expect(cols('order_item_retail_prices')).toContain('retailer_org_id');
  });

  test('order_item_retail_prices politikası yalnız perakendeci içindir', () => {
    const ps = policiesFor('order_item_retail_prices');
    expect(ps.length).toBeGreaterThan(0);
    for (const p of ps) {
      expect(p).toMatch(/retailer_org_id\s*=\s*\(select public\.get_my_org_id\(\)\)/);
      expect(p).not.toMatch(/manufacturer_org_id/);
    }
  });

  test('orders tutarı KATMAN 2 bazlıdır; perakende tutarı yok', () => {
    const c = cols('orders');
    expect(c).toContain('total_amount');
    expect(c).not.toContain('retail_total_amount');
  });
});

describe('cari defter — değişmezlik ve running balance (A8/A18)', () => {
  test('transactions balance_after taşır', () => {
    expect(cols('transactions')).toContain('balance_after');
  });

  test('transactions için UPDATE/DELETE politikası YOK', () => {
    // Yazma tümüyle atomik RPC'lerden; append-only defter.
    const ps = policiesFor('transactions');
    for (const p of ps) {
      expect(p).not.toMatch(/for\s+(update|delete|all)\b/i);
    }
  });

  test('hiçbir RPC mevcut transaction satırını UPDATE veya DELETE etmiyor', () => {
    // A8: kök siparişin ilk debit kaydı asla değişmez.
    for (const fn of ['place_order_atomic', 'cancel_order_atomic', 'add_manual_transaction']) {
      const body = fnBody(fn);
      expect(body, `${fn} bulunamadı`).not.toBe('');
      expect(body).not.toMatch(/update\s+public\.transactions/i);
      expect(body).not.toMatch(/delete\s+from\s+public\.transactions/i);
    }
  });

  test('bakiye SUM() ile hesaplanmıyor', () => {
    // Milyonlarca satırda SUM her ekran açılışında tam tarama demek.
    for (const fn of ['current_balance', 'place_order_atomic', 'cancel_order_atomic']) {
      expect(fnBody(fn)).not.toMatch(/sum\s*\(/i);
    }
  });

  test('yeni bakiye yazılırken önceki satır kilitleniyor', () => {
    // Eşzamanlı iki sipariş aynı balance_after değerini yarıştırmamalı.
    for (const fn of ['place_order_atomic', 'cancel_order_atomic', 'add_manual_transaction']) {
      expect(fnBody(fn)).toMatch(/order by t\.created_at desc[\s\S]*?for update/i);
    }
  });

  test('iptal, dengeleyici credit INSERT ile yapılır', () => {
    const body = fnBody('cancel_order_atomic');
    expect(body).toMatch(/insert into public\.transactions/i);
    expect(body).toMatch(/'credit'/);
  });
});

describe('place_order_atomic — fiyat ve yetki', () => {
  const body = fnBody('place_order_atomic');

  test('üreticinin maliyetine HİÇ bakmıyor', () => {
    // A5: cari yalnız supplier_unit_price üzerinden işler.
    expect(body).not.toMatch(/product_costs/i);
  });

  test('iskonto supplier fiyatına yazılırken uygulanıyor', () => {
    expect(body).toMatch(/supplier_price\s*\*\s*\(1\s*-\s*v_rel\.discount_rate/i);
  });

  test('snapshot allowlist ile kuruluyor, to_jsonb(ürün) ile değil', () => {
    expect(body).toMatch(/jsonb_build_object/);
    expect(body).not.toMatch(/to_jsonb\(\s*v_product\s*\)/i);
  });

  test('yalnız perakendeci sipariş verebilir', () => {
    expect(body).toMatch(/v_rel\.retailer_org_id <> v_me/);
    expect(body).toMatch(/FORBIDDEN/);
  });

  test('yalnız aktif ilişkide sipariş verilir', () => {
    expect(body).toMatch(/status = 'active'/);
    expect(body).toMatch(/NO_ACTIVE_RELATIONSHIP/);
  });

  test('ürün karşı tarafın kataloğundan seçilmek zorunda', () => {
    expect(body).toMatch(/owner_org_id = v_rel\.manufacturer_org_id/);
  });
});

describe('durum akışı ve yetki ayrımı', () => {
  test('geçmiş kaydı ESKİ durumu yazıyor', () => {
    // `returning * into` sonrası satır yeni durumu taşır; eski durum
    // güncellemeden ÖNCE saklanmazsa geçmiş yanlış olur.
    for (const fn of ['advance_order_status', 'cancel_order_atomic']) {
      const body = fnBody(fn);
      expect(body).toMatch(/v_from\s*:=\s*v_order\.status/);
      expect(body).toMatch(/values \(p_order_id, v_from,/);
    }
  });

  test('teslim onayı perakendecinin, üretim akışı üreticinindir', () => {
    const body = fnBody('advance_order_status');
    expect(body).toMatch(/p_status in \('confirmed', 'in_production', 'shipped'\)/);
    expect(body).toMatch(/p_status = 'delivered'[\s\S]*?retailer_org_id <> v_me/);
  });

  test('kapanmış sipariş yeniden ilerletilemez', () => {
    expect(fnBody('advance_order_status')).toMatch(/ORDER_CLOSED/);
  });
});

describe('ölçek — sipariş ve cari index şekli (A17)', () => {
  test('orders her iki yön için keyset indexli', () => {
    expect(sql).toMatch(/create index orders_mfr_idx[^;]*created_at desc, id desc/i);
    expect(sql).toMatch(/create index orders_rtl_idx[^;]*created_at desc, id desc/i);
  });

  test('cari bakiye tek lookup ile okunabilir', () => {
    expect(sql).toMatch(/create index transactions_rel_idx[^;]*created_at desc, id desc/i);
  });

  test('sipariş politikalarında küme üyeliği yok', () => {
    for (const t of ['orders', 'transactions']) {
      for (const p of policiesFor(t)) {
        expect(p).not.toMatch(/relationship_id\s+in\s*\(\s*select/i);
      }
    }
  });
});

describe('public takip — jeton bilen görür, fiyat görmez', () => {
  const body = fnBody('track_order');

  test('fiyat alanı döndürmüyor', () => {
    expect(body).not.toMatch(/supplier_unit_price|total_amount|retail_unit_price|cost_price/i);
  });

  test('anon yalnız bu fonksiyona yetkili', () => {
    expect(sql).toMatch(/grant execute on function public\.track_order\(uuid\) to anon/i);
  });
});
