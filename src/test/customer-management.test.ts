/**
 * Müşteri yönetimi — şema tarafı garantileri.
 *
 * İki hassas nokta var: VKN sorgusu RLS'i aşan bir okuma yapar, kart düzenleme
 * ve şifre sıfırlama ise BAŞKA bir organizasyonun kaydına dokunur. İkisinin de
 * sınırı dar tutulmak zorunda.
 */
import { describe, expect, test } from 'vitest';
import { functionBody, loadMigrationSql } from './sqlSchema';

const sql = loadMigrationSql();

describe('lookup_org_by_vkn', () => {
  const body = functionBody('lookup_org_by_vkn');

  test('yalnız ABONE org sorgulayabilir', () => {
    expect(body).toMatch(/if not v_me\.is_subscriber then/i);
    expect(body).toMatch(/NOT_SUBSCRIBER/);
  });

  test('DAR alan kümesi döner — iletişim bilgisi sızmaz', () => {
    // Firma adı, tipi ve abonelik durumu ticari sicilde zaten açıktır;
    // e-posta, telefon ve adres bu sorgudan DÖNMEZ.
    expect(body).toMatch(/v_out\.company_name := v_target\.company_name/i);
    expect(body).not.toMatch(/v_out\.\w*email/i);
    expect(body).not.toMatch(/v_out\.\w*phone/i);
    expect(body).not.toMatch(/v_out\.\w*address/i);
  });

  test('geçersiz numarada sorgu yapılmaz', () => {
    expect(body).toMatch(/if not public\.is_valid_vkn_tc\(v_vkn\) then\s+return v_out;/i);
  });

  test('mevcut ilişkinin durumu da döner', () => {
    // "Zaten müşteriniz" ile "yeni bağlanacaksınız" farklı mesajlardır.
    expect(body).toMatch(/select r\.status into v_out\.relationship_status/i);
  });

  test('karşı tarafın giriş hesabı olup olmadığı bildirilir', () => {
    // Girişi olan bir firmaya şifre sormak kullanıcıyı yanıltırdı.
    expect(body).toMatch(/v_out\.has_login := exists/i);
  });

  test('STABLE ve search_path sabitlenmiş', () => {
    expect(sql).toMatch(
      /create or replace function public\.lookup_org_by_vkn[\s\S]*?stable[\s\S]*?set search_path = public/i,
    );
  });
});

describe('update_counterparty_profile', () => {
  const body = functionBody('update_counterparty_profile');

  test('ABONE firmanın kartı düzenlenemez', () => {
    // Abone org kendi kartının sahibidir; sponsor onu değiştiremez.
    expect(body).toMatch(/if v_target\.is_subscriber then/i);
    expect(body).toMatch(/TARGET_IS_SUBSCRIBER/);
  });

  test('yalnız gerçekten karşı tarafım olan firma düzenlenebilir', () => {
    expect(body).toMatch(/from public\.relationships r/i);
    expect(body).toMatch(/NOT_MY_COUNTERPARTY/);
  });

  test('muhasebeci düzenleyemez', () => {
    expect(body).toMatch(/get_my_org_role\(\) not in \('owner', 'staff'\)/i);
  });

  test('VKN DEĞİŞTİRİLMEZ — yakınsama anahtarıdır (A3)', () => {
    const update = /update public\.organizations[\s\S]*?where id = p_org_id;/i.exec(body)?.[0] ?? '';
    expect(update).not.toMatch(/vkn_tc\s*=/i);
    expect(update).not.toMatch(/is_subscriber\s*=/i);
    expect(update).not.toMatch(/kind\s*=/i);
  });

  test('boş gönderilen alan mevcut değeri SİLMEZ', () => {
    // Kısmi güncelleme: yalnız dolu gelen alanlar yazılır.
    expect(body).toMatch(/coalesce\(nullif\(btrim\(p_company_name\), ''\), company_name\)/i);
  });

  test('işlem denetim kaydına yazılır', () => {
    expect(body).toMatch(/insert into public\.system_logs/i);
  });
});
