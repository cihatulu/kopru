/**
 * Faz 7a — SSH ve iade akışlarının şema garantileri.
 *
 * En kritik iddia: iade tutarı TALEPTEN değil SİPARİŞTEN hesaplanır. Aksi halde
 * talebi açan taraf iade tutarını kendisi belirleyebilirdi.
 */
import { describe, expect, test } from 'vitest';
import { functionBody, loadMigrationSql, policiesFor, schemaFromMigrations } from './sqlSchema';

const sql = loadMigrationSql();
const schema = schemaFromMigrations();
const cols = (t: string) => [...(schema.get(t) ?? [])];

describe('şema — denormalize sahiplik (A16)', () => {
  for (const t of ['ssh_requests', 'return_requests']) {
    test(`${t} her iki org id yi taşıyor`, () => {
      expect(cols(t)).toContain('manufacturer_org_id');
      expect(cols(t)).toContain('retailer_org_id');
      expect(cols(t)).toContain('relationship_id');
    });

    test(`${t} politikaları küme üyeliği kullanmıyor`, () => {
      const ps = policiesFor(t);
      expect(ps.length).toBeGreaterThan(0);
      for (const p of ps) expect(p).not.toMatch(/relationship_id\s+in\s*\(\s*select/i);
    });

    test(`${t} yazma politikası yok — yalnız RPC`, () => {
      for (const p of policiesFor(t)) {
        expect(p).not.toMatch(/for\s+(insert|update|delete|all)\b/i);
      }
    });

    test(`${t} anon rolüne kapalı`, () => {
      expect(sql).toMatch(new RegExp(`revoke all on public\\.${t} from anon`, 'i'));
    });
  }
});

describe('iade tutarı — talep sahibi belirleyemez', () => {
  const body = functionBody('confirm_return_atomic');

  test('fonksiyon mevcut', () => {
    expect(body.length).toBeGreaterThan(0);
  });

  test('tutar order_items.supplier_unit_price den hesaplanıyor', () => {
    expect(body).toMatch(/v_item\.supplier_unit_price \* v_qty/);
  });

  test('talepteki tutar alanı kullanılmıyor', () => {
    // `items` yalnız hangi kalemden kaç adet iade edileceğini taşır.
    expect(body).not.toMatch(/v_line->>'amount'|v_line->>'price'|v_line->>'total'/);
  });

  test('perakendecinin satış fiyatı iade tutarına karışmıyor (A5)', () => {
    expect(body).not.toMatch(/retail_unit_price|order_item_retail_prices/i);
  });

  test('iade adedi sipariş adedini aşamaz', () => {
    expect(body).toMatch(/least\(\(v_line->>'quantity'\)::numeric, v_item\.quantity\)/);
  });

  test('kararı malı gönderen taraf verir', () => {
    expect(body).toMatch(/v_req\.manufacturer_org_id <> v_me/);
    expect(body).toMatch(/FORBIDDEN/);
  });
});

describe('iade ve cari defter (A8/A18)', () => {
  const body = functionBody('confirm_return_atomic');

  test('mevcut borç kaydı DEĞİŞTİRİLMİYOR', () => {
    expect(body).not.toMatch(/update\s+public\.transactions/i);
    expect(body).not.toMatch(/delete\s+from\s+public\.transactions/i);
  });

  test('dengeleyici credit ekleniyor', () => {
    expect(body).toMatch(/insert into public\.transactions/i);
    expect(body).toMatch(/'credit'/);
  });

  test('bakiye SUM ile değil önceki satırdan alınıyor ve kilitleniyor', () => {
    expect(body).not.toMatch(/sum\s*\(/i);
    expect(body).toMatch(/order by t\.created_at desc[\s\S]*?for update/i);
  });

  test('iade edilen mal stoğa geri dönüyor', () => {
    expect(body).toMatch(/insert into public\.manufacturer_stock/i);
    expect(body).toMatch(/quantity \+ v_qty/);
  });
});

describe('iade talebi', () => {
  const body = functionBody('create_return_request');

  test('iadeyi malı alan taraf açar', () => {
    expect(body).toMatch(/v_order\.retailer_org_id <> v_me/);
  });

  test('aynı siparişte ikinci bekleyen talep açılamaz', () => {
    expect(body).toMatch(/RETURN_ALREADY_PENDING/);
  });

  test('boş iade reddedilir', () => {
    expect(body).toMatch(/EMPTY_RETURN/);
  });
});

describe('SSH yetki ayrımı', () => {
  const body = functionBody('advance_ssh_status');

  test('servis akışını üretici yürütür', () => {
    expect(body).toMatch(/v_row\.manufacturer_org_id <> v_me/);
  });

  test('iptal her iki tarafça yapılabilir', () => {
    expect(body).toMatch(/p_status = 'iptal'/);
  });

  test('kapanmış talep yeniden ilerletilemez', () => {
    expect(body).toMatch(/SSH_CLOSED/);
  });
});

describe('plan gating — çift katman (kilitli kural 15)', () => {
  test('modül kontrolü sunucuda da yapılıyor', () => {
    for (const fn of ['create_ssh_request', 'create_return_request']) {
      expect(functionBody(fn)).toMatch(/relationship_has_module/);
      expect(functionBody(fn)).toMatch(/MODULE_NOT_ENABLED/);
    }
  });

  test('modül ilişkideki herhangi bir tarafın planından gelir', () => {
    // Özelliğin bedelini abone öder ama ilişki iki taraflıdır; misafir müşterinin
    // iade talebi açamaması iş anlamında yanlış olurdu.
    const body = functionBody('relationship_has_module');
    expect(body).toMatch(/o\.id in \(r\.manufacturer_org_id, r\.retailer_org_id\)/);
    expect(body).toMatch(/enabled_modules \? p_module/);
  });
});
