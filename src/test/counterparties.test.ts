/**
 * Faz 5 — ekosistem büyütmenin şema garantileri.
 *
 * Bu kurallar köprünün yerine geçen mekanizmanın kendisi. Bozulurlarsa ya kopya
 * organizasyonlar oluşur (VKN yakınsaması kaybolur) ya da bir abone başka bir
 * aboneyi onayı olmadan kendi ekosistemine bağlayabilir.
 */
import { loadMigrationSql, functionBody } from './sqlSchema';

const sql = loadMigrationSql();

describe('add_counterparty — VKN yakınsaması', () => {
  const body = functionBody('add_counterparty');

  test('fonksiyon mevcut', () => {
    expect(body.length).toBeGreaterThan(0);
  });

  test('önce mevcut org aranır, bulunursa yeni org AÇILMAZ', () => {
    // Kopya org açmak yakınsamayı bozar: aynı firma iki düğüm olur, sipariş
    // geçmişi bölünür (ERROR_PROTOCOLS #14).
    const lookupAt = body.search(/select o\.\* into v_target[\s\S]*?where o\.vkn_tc = v_vkn/i);
    const insertAt = body.search(/insert into public\.organizations/i);
    expect(lookupAt).toBeGreaterThan(-1);
    expect(insertAt).toBeGreaterThan(-1);
    expect(lookupAt).toBeLessThan(insertAt);
    // INSERT yalnız `else` dalında — yani org bulunamadığında.
    expect(body).toMatch(/if found then[\s\S]*?else[\s\S]*?insert into public\.organizations/i);
  });

  test('VKN checksum doğrulanır', () => {
    expect(body).toMatch(/is_valid_vkn_tc\(v_vkn\)/);
    expect(body).toMatch(/INVALID_VKN/);
  });

  test('org kendini ekleyemez', () => {
    expect(body).toMatch(/SELF_REFERENCE/);
  });

  test('A15: karşı taraf her zaman ters tipte olur', () => {
    expect(body).toMatch(/case v_me\.kind when 'manufacturer' then 'retailer' else 'manufacturer'/i);
    expect(body).toMatch(/KIND_MISMATCH/);
  });
});

describe('add_counterparty — yetki ve onay', () => {
  const body = functionBody('add_counterparty');

  test('yalnız aboneler karşı taraf ekleyebilir', () => {
    expect(body).toMatch(/if not v_me\.is_subscriber then/i);
    expect(body).toMatch(/NOT_SUBSCRIBER/);
  });

  test('karşı taraf ABONEYSE ilişki pending açılır — yön farketmez', () => {
    // Bir abone başka bir aboneyi ONAYI OLMADAN kendi ekosistemine bağlayamaz;
    // abone org'un kendi paneli vardır, kimin müşterisi/tedarikçisi olacağına
    // kendisi karar verir (PLAN.md §5).
    //
    // 20260810060000 bu kuralı perakendeci→üye üretici yönünde delmişti:
    // ilişki onaysız `active` açılıyor, üreticiye hiçbir bildirim gitmiyordu.
    // Gerekçesi "sürtünme" idi, ama sürtünmenin sebebi onay adımı değil
    // bildirimin hiç olmamasıydı. 20260816070000 kuralı geri getirdi,
    // bildirim de kenar çubuğu rozeti + üst çubuk ikonu olarak eklendi.
    expect(functionBody('add_counterparty')).toMatch(
      /v_status\s*:=\s*case\s+when\s+v_target\.is_subscriber\s+then\s+'pending'/i,
    );
  });

  test('mevcut ilişkinin durumu sessizce değiştirilmez', () => {
    // Pasif bir kenarı diriltmek karşı tarafın kararını geçersiz kılardı.
    expect(body).toMatch(/already_existed|return \(v_rel\.id, v_target\.id, false, v_rel\.status/i);
  });
});

describe('respond_to_connection_request', () => {
  const body = functionBody('respond_to_connection_request');

  test('isteği başlatan kendi isteğini onaylayamaz', () => {
    expect(body).toMatch(/v_me = v_rel\.initiated_by_org_id/);
    expect(body).toMatch(/FORBIDDEN/);
  });

  test('yalnız ilişkinin tarafları yanıtlayabilir', () => {
    expect(body).toMatch(/v_me not in \(v_rel\.manufacturer_org_id, v_rel\.retailer_org_id\)/);
  });

  test('yalnız pending istek yanıtlanır ve satır kilitlenir', () => {
    expect(body).toMatch(/status = 'pending'/);
    expect(body).toMatch(/for update/i);
  });
});

describe('set_counterparty_discount — iskonto üreticinindir', () => {
  const body = functionBody('set_counterparty_discount');

  test('yalnız üretici tarafı iskonto belirleyebilir', () => {
    // İskonto üreticinin KENDİ satış fiyatına uyguladığı indirimdir (A5);
    // perakendeci kendi maliyetini düşüremez.
    expect(body).toMatch(/v_rel\.manufacturer_org_id <> v_me/);
    expect(body).toMatch(/FORBIDDEN/);
  });

  test('oran 0-100 aralığında sınırlanır', () => {
    expect(body).toMatch(/p_discount_rate < 0 or p_discount_rate > 100/);
  });
});

describe('request_subscription — misafirin self-servis talebi', () => {
  const body = functionBody('request_subscription');

  test('abone tekrar talep edemez', () => {
    expect(body).toMatch(/ALREADY_SUBSCRIBER/);
  });

  test('açık talep varsa yenisi açılmaz', () => {
    expect(body).toMatch(/where org_id = v_me\.id and status = 'pending'/i);
  });

  test('yalnız owner talep açabilir', () => {
    expect(body).toMatch(/get_my_org_role\(\) <> 'owner'/);
  });
});

describe('köprü kalıntısı yok', () => {
  test('eşleşme kodu, secret veya sync log kavramı şemada geçmiyor', () => {
    // Tek DB'de bunların hiçbiri gerekmiyor; tek onay adımı yeterli.
    expect(sql).not.toMatch(/pairing_code|outbound_secret|bridge_sync_log|bridge_connections/i);
  });
});
