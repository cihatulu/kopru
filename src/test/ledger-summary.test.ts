/**
 * Cari dönem özeti — şema tarafı garantileri.
 *
 * Cari, iki firmanın parasal mutabakatıdır; buradaki her koruma bir mutabakat
 * hatasını engelliyor.
 */
import { describe, expect, test } from 'vitest';
import { functionBody, loadMigrationSql } from './sqlSchema';

const sql = loadMigrationSql();
const body = functionBody('ledger_period_summary');

describe('ledger_period_summary', () => {
  test('fonksiyon tanımlı ve search_path sabitlenmiş (kilitli kural 4)', () => {
    expect(body).not.toBe('');
    expect(sql).toMatch(
      /create or replace function public\.ledger_period_summary[\s\S]*?set search_path = public/i,
    );
  });

  test('yalnız ilişkinin tarafları (veya admin) görebilir', () => {
    expect(body).toMatch(
      /v_me not in \(v_rel\.manufacturer_org_id, v_rel\.retailer_org_id\)/i,
    );
    expect(body).toMatch(/is_platform_admin\(\)/);
    expect(body).toMatch(/FORBIDDEN/);
  });

  test('AÇILIŞ bakiyesi toplanarak değil, önceki satırın balance_after ile bulunur', () => {
    // A18: bakiye SUM() ile hesaplanmaz. Dönem başı için de aynısı geçerli;
    // toplasaydık ilişkinin tüm geçmişini taramak zorunda kalırdık.
    // Açılış sorgusu, ilk toplama ifadesinden ÖNCEKİ bölümdür.
    const opening = body.slice(0, body.search(/coalesce\(sum\(/i));
    expect(opening).toMatch(/t\.balance_after/i);
    expect(opening).not.toMatch(/sum\(/i);
    expect(opening).toMatch(/order by t\.created_at desc, t\.id desc\s+limit 1/i);
  });

  test('alt sınır YOKSA devir hesaplanmaz — açılış sıfırdır', () => {
    // Canlıda yaşandı: koşul `(p_from is null or created_at < p_from)` idi ve
    // p_from null iken TÜM satırlar eşleşip SON bakiye "açılış" sanılıyordu.
    // Kapanış açılıştan türetildiği için tutarlar İKİ KEZ sayılıyor, 108.000 ₺
    // lik cari 216.000 ₺ görünüyordu. Zaman başlangıcından önce hareket olamaz.
    expect(body).toMatch(/v_out\.opening_balance := 0;/i);
    expect(body).toMatch(/if p_from is not null then[\s\S]*?t\.created_at < p_from/i);
    expect(body).not.toMatch(/p_from is null or t\.created_at < p_from/i);
  });

  test('dönem toplamları SINIRLI aralıkta hesaplanır', () => {
    // Sınırsız SUM() A18 ihlali olurdu; aralık indeksten taranır.
    expect(body).toMatch(/p_from is null or t\.created_at >= p_from/i);
    expect(body).toMatch(/p_to\s+is null or t\.created_at <\s+p_to/i);
  });

  test('üst sınır DIŞLAYICI (`<`), dahil edici değil', () => {
    // `<=` olsaydı istemci ertesi günün başlangıcını gönderdiğinde o günün
    // 00:00'ında girilen hareket iki döneme birden düşerdi.
    expect(body).not.toMatch(/t\.created_at <= p_to/i);
  });

  test('kapanış açılıştan TÜRETİLİR, ayrı sorgulanmaz', () => {
    // Ayrı sorgulansaydı iki sayı arasına yeni bir kayıt düşebilir ve
    // "açılış + borç - alacak ≠ kapanış" durumu oluşurdu.
    expect(body).toMatch(
      /closing_balance := v_out\.opening_balance \+ v_out\.total_debit - v_out\.total_credit/i,
    );
  });

  test('borç ve alacak ayrı toplanır', () => {
    expect(body).toMatch(/case when t\.type = 'debit'\s+then t\.amount else 0 end/i);
    expect(body).toMatch(/case when t\.type = 'credit' then t\.amount else 0 end/i);
  });

  test('kayıt yoksa açılış sıfırdır', () => {
    expect(body).toMatch(/v_out\.opening_balance := coalesce\(v_out\.opening_balance, 0\)/i);
  });
});

describe('elle cari hareketi — kilitli kural 8', () => {
  const manual = functionBody('add_manual_transaction');

  test('yalnız PERAKENDECİ tarafı yazabilir', () => {
    // Üretici cariyi yalnızca izler.
    expect(manual).toMatch(/v_rel\.retailer_org_id <> v_me/i);
  });

  test('yalnız owner veya accountant', () => {
    expect(manual).toMatch(/get_my_org_role\(\) not in \('owner', 'accountant'\)/i);
  });

  test('bakiye önceki satırdan devralınır, SUM ile hesaplanmaz (A18)', () => {
    expect(manual).toMatch(/t\.balance_after into v_prev/i);
    expect(manual).not.toMatch(/sum\(/i);
  });

  test('yarış koşuluna karşı son satır kilitlenir', () => {
    expect(manual).toMatch(/for update/i);
  });

  test('mevcut satırlar GÜNCELLENMEZ — yalnız yeni INSERT (A8)', () => {
    expect(manual).not.toMatch(/update public\.transactions/i);
    expect(manual).not.toMatch(/delete from public\.transactions/i);
  });

  test('sıfır/negatif tutar ve boş açıklama reddedilir', () => {
    expect(manual).toMatch(/INVALID_AMOUNT/);
    expect(manual).toMatch(/DESCRIPTION_REQUIRED/);
  });
});
