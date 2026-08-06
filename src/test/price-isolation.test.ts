/**
 * ÜÇ FİYAT KATMANI SIZDIRMAZLIK TESTİ (A4 · kilitli kural 5)
 *
 * Projenin en yüksek riskli kuralı. Köprü çağında izolasyon "o alanı hiç göndermemek"
 * ile sağlanıyordu; tek veritabanında bu koruma kendiliğinden kaybolur.
 *
 * İki katman:
 *   1. ŞEMA ASSERTION — veritabanı gerektirmez, CI'da her zaman çalışır.
 *   2. ROL BAZLI ERİŞİM — canlı Supabase gerektirir, env yoksa atlanır.
 */
import { describe, expect, test } from 'vitest';
import { loadMigrationSql, policiesFor, schemaFromMigrations } from './sqlSchema';

const schema = schemaFromMigrations();
const cols = (table: string) => [...(schema.get(table) ?? [])];

describe('şema assertion — yasak kolonlar', () => {
  test('migration dosyaları okunabiliyor', () => {
    expect(schema.size).toBeGreaterThan(0);
  });

  test('KATMAN 1: products tablosunda cost_price YOK', () => {
    // Buraya eklenirse perakendeci products'ı okurken üreticinin maliyetini görür.
    expect(cols('products')).not.toContain('cost_price');
  });

  test('KATMAN 3: products tablosunda retail_price YOK', () => {
    expect(cols('products')).not.toContain('retail_price');
  });

  test('KATMAN 2: products.supplier_price VAR — iki tarafın gördüğü tek fiyat', () => {
    expect(cols('products')).toContain('supplier_price');
  });

  test('gizli fiyat tabloları ayrı ve mevcut', () => {
    expect(schema.has('product_costs')).toBe(true);
    expect(schema.has('retail_prices')).toBe(true);
    expect(cols('product_costs')).toContain('cost_price');
    expect(cols('retail_prices')).toContain('retail_price');
  });

  test('product_costs sahiplik kolonunu denormalize taşır (A16)', () => {
    // RLS'in join'siz, tek indexli eşitlikle çalışabilmesi için.
    expect(cols('product_costs')).toContain('owner_org_id');
  });

  test('order_items tablosunda retail_unit_price ve cost_price YOK', () => {
    // Tablo Faz 6'da oluşacak; test şimdiden koruma görevini üstlenir.
    expect(cols('order_items')).not.toContain('retail_unit_price');
    expect(cols('order_items')).not.toContain('cost_price');
  });
});

describe('RLS politika assertion — gizli tablolarda karşı tarafa politika yok', () => {
  const sql = loadMigrationSql();

  test('product_costs politikası yalnız owner_org_id üzerinden', () => {
    const ps = policiesFor('product_costs');
    expect(ps.length).toBeGreaterThan(0);
    for (const p of ps) {
      expect(p).toMatch(/owner_org_id\s*=\s*\(select public\.get_my_org_id\(\)\)/);
      expect(p).not.toMatch(/retailer_org_id/);
    }
  });

  test('retail_prices politikası yalnız retailer_org_id üzerinden', () => {
    const ps = policiesFor('retail_prices');
    expect(ps.length).toBeGreaterThan(0);
    for (const p of ps) {
      expect(p).toMatch(/retailer_org_id\s*=\s*\(select public\.get_my_org_id\(\)\)/);
      expect(p).not.toMatch(/manufacturer_org_id/);
    }
  });

  test('gizli fiyat tablolarında RLS açık', () => {
    expect(sql).toMatch(/alter table public\.product_costs enable row level security/i);
    expect(sql).toMatch(/alter table public\.retail_prices enable row level security/i);
  });

  test('gizli fiyat tabloları anon rolüne kapalı', () => {
    expect(sql).toMatch(/revoke all on public\.product_costs from anon/i);
    expect(sql).toMatch(/revoke all on public\.retail_prices from anon/i);
  });
});

/**
 * Rol bazlı canlı erişim testi — Faz 3'te seed + test kullanıcıları hazır olunca doldurulacak.
 * `persistSession: false` ZORUNLU; aksi halde test client'ları birbirinin oturumunu ezer.
 */
const hasDb = !!process.env.VITE_SUPABASE_URL && !!process.env.E2E_MANUFACTURER_CODE;

describe.skipIf(!hasDb)('rol bazlı erişim (canlı DB)', () => {
  test.todo('üretici oturumu → retail_prices 0 satır');
  test.todo('üretici oturumu → order_item_retail_prices 0 satır');
  test.todo('perakendeci oturumu → product_costs 0 satır');
  test.todo('her iki taraf → order_items.supplier_unit_price aynı değeri görür');
  test.todo('perakendeci A → perakendeci B nin retail_prices satırını göremez');
});
