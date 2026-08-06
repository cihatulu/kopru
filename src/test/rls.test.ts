/**
 * RLS + ÖLÇEK TESTİ (A10 · A16 · A17)
 *
 * Hedef: 5.000 üretici × 50.000 perakendeci × ~500.000 ilişki.
 * Bu ölçekte RLS'in KENDİSİ sorgu planını bozabilir; bu yüzden politika şekli
 * de en az politika doğruluğu kadar test edilir.
 *
 * Statik katman veritabanı gerektirmez ve CI'da her zaman çalışır.
 */
import { describe, expect, test } from 'vitest';
import { loadMigrationSql, policiesFromMigrations } from './sqlSchema';

// Yorumlar temizlenmiş SQL — kural metinleri ve yorum içindeki `;` eşleşmeye karışmasın.
const code = loadMigrationSql();

const createdTables = [...code.matchAll(/create\s+table\s+public\.(\w+)/gi)].map((m) => m[1]!);
const policies = policiesFromMigrations();

describe('RLS temel standartları (kilitli kural 4)', () => {
  test('her tabloda RLS açık', () => {
    const missing = createdTables.filter(
      (t) => !new RegExp(`alter table public\\.${t} enable row level security`, 'i').test(code),
    );
    expect(missing).toEqual([]);
  });

  test('hiçbir politikada düz auth.uid() yok', () => {
    // Düz auth.uid() satır başına yeniden değerlendirilir (auth_rls_initplan).
    const bad = policies.filter((p) => /(?<!\(select\s)auth\.uid\(\)/.test(p));
    expect(bad).toEqual([]);
  });

  test('tüm fonksiyonlar SET search_path = public içerir', () => {
    const fns = [...code.matchAll(/create\s+or\s+replace\s+function[^;]+?\$\$/gis)].map((m) => m[0]);
    const missing = fns.filter((f) => !/set\s+search_path\s*=\s*public/i.test(f));
    expect(missing).toEqual([]);
  });

  test('RLS yardımcıları SECURITY DEFINER + STABLE', () => {
    // Politika içinden tablo sorgulamak sonsuz özyinelemeye yol açar; helper'lar
    // RLS'i bypass ettiği için o döngü oluşmaz (ERROR_PROTOCOLS #3).
    for (const fn of ['get_my_org_id', 'get_my_org_kind', 'is_platform_admin']) {
      const body = new RegExp(
        `create\\s+or\\s+replace\\s+function\\s+public\\.${fn}[\\s\\S]*?\\$\\$`,
        'i',
      ).exec(code)?.[0];
      expect(body, `${fn} bulunamadı`).toBeTruthy();
      expect(body).toMatch(/security\s+definer/i);
      expect(body).toMatch(/\bstable\b/i);
    }
  });
});

describe('ölçek — RLS anahtarı ve index şekli (A16 / A17)', () => {
  test('hiçbir politikada relationship_id IN (SELECT ...) deseni yok', () => {
    // 10.000 perakendecisi olan bir üreticide bu desen her sorguda 10.000
    // UUID'lik küme materyalize eder. RLS denormalize org id eşitliğiyle çalışır.
    const bad = policies.filter((p) => /relationship_id\s+in\s*\(\s*select/i.test(p));
    expect(bad).toEqual([]);
  });

  test('my_relationship_ids() hiçbir politikada kullanılmıyor', () => {
    // Yalnız admin/rapor sorguları için; RLS sıcak yolunda değil.
    const bad = policies.filter((p) => /my_relationship_ids\s*\(/i.test(p));
    expect(bad).toEqual([]);
  });

  test('relationships tablosu her iki yön için indexli', () => {
    expect(code).toMatch(/create index[^;]*on public\.relationships\s*\(manufacturer_org_id/i);
    expect(code).toMatch(/create index[^;]*on public\.relationships\s*\(retailer_org_id/i);
  });

  test('katalog listesi keyset pagination indexi taşır', () => {
    // (owner, ..., created_at desc, id desc) — hem RLS hem sayfalama aynı index'i kullanır.
    expect(code).toMatch(
      /create index products_owner_idx[^;]*created_at desc,\s*id desc/i,
    );
  });

  test('org arama trigram indexi var (55.000 satırda tam tarama olmaz)', () => {
    expect(code).toMatch(/using gin \(company_name gin_trgm_ops\)/i);
  });
});

describe('model bütünlüğü (A2 / A3 / A15)', () => {
  test('vkn_tc benzersiz ve checksum doğrulamalı', () => {
    expect(code).toMatch(/vkn_tc text not null unique check \(public\.is_valid_vkn_tc\(vkn_tc\)\)/i);
  });

  test('A15: ilişki kenarı kind uyumunu bildirimsel FK ile zorlar', () => {
    // generated sabit kolon + bileşik FK → yanlış kind'lı org yazılamaz, trigger gerekmez.
    expect(code).toMatch(/manufacturer_kind[\s\S]*?generated always as \('manufacturer'/i);
    expect(code).toMatch(/retailer_kind[\s\S]*?generated always as \('retailer'/i);
    expect(code).toMatch(/references public\.organizations \(id, kind\)/i);
  });

  test('A2: is_shadow benzeri hayalet kayıt alanı yok', () => {
    expect(code).not.toMatch(/\bis_shadow\b/i);
  });

  test('kilitli kural 2: password_hash kolonu hiçbir yerde yok', () => {
    expect(code).not.toMatch(/\bpassword_hash\b/i);
  });

  test('abone ⇔ plan tutarlılığı CHECK ile zorlanır', () => {
    expect(code).toMatch(/check \(is_subscriber = \(plan is not null\)\)/i);
  });
});

/**
 * Canlı izolasyon testleri — Faz 3'te seed + test kullanıcıları hazır olunca doldurulacak.
 * `persistSession: false` ZORUNLU (test client'ları birbirinin oturumunu ezmesin).
 */
const hasDb = !!process.env.VITE_SUPABASE_URL && !!process.env.E2E_MANUFACTURER_CODE;

describe.skipIf(!hasDb)('canlı izolasyon', () => {
  test.todo('üretici org, ilişkisi olmayan siparişi göremez');
  test.todo('perakendeci A, perakendeci B nin verisini göremez');
  test.todo('misafir org, ilişkisi passive olduğunda o ilişkinin verisini göremez');
  test.todo('staff/accountant kendi org kapsamı dışına çıkamaz');
  test.todo('anon hiçbir tabloyu okuyamaz');
});
