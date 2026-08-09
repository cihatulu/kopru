/**
 * Ürün grubu üyeliği — şema tarafı garantileri.
 *
 * Grup bir ETİKETTİR: ürüne ait değil, üründen bağımsız. Buradaki korumalar
 * bu ayrımı ve sahiplik sınırını koruyor.
 */
import { describe, expect, test } from 'vitest';
import { functionBody, loadMigrationSql } from './sqlSchema';

const sql = loadMigrationSql();

describe('assign_products_to_group', () => {
  const body = functionBody('assign_products_to_group');

  test('yalnız ÜRETİCİ ve owner/staff çağırabilir', () => {
    expect(body).toMatch(/get_my_org_kind\(\) <> 'manufacturer'/i);
    expect(body).toMatch(/get_my_org_role\(\) not in \('owner', 'staff'\)/i);
    expect(body).toMatch(/FORBIDDEN/);
  });

  test('başkasının grubuna ürün taşınamaz', () => {
    expect(body).toMatch(/g\.owner_org_id = v_me/i);
    expect(body).toMatch(/GROUP_NOT_FOUND/);
  });

  test('yalnız kendi ürünlerim güncellenir', () => {
    // Listeye yabancı bir id yazmak başkasının ürününü gruba almaya yetmemeli.
    expect(body).toMatch(/update public\.products[\s\S]*?owner_org_id = v_me/i);
  });

  test('grup null verilebilir — gruptan çıkarma', () => {
    expect(sql).toMatch(/assign_products_to_group\([\s\S]*?p_group_id uuid default null/i);
  });

  test('işlenen satır sayısı döner', () => {
    expect(body).toMatch(/get diagnostics v_count = row_count/i);
  });
});

describe('set_group_products', () => {
  const body = functionBody('set_group_products');

  test('listede olmayanlar gruptan ÇIKARILIR', () => {
    expect(body).toMatch(/set group_id = null[\s\S]*?not \(id = any\(/i);
  });

  test('gruptan çıkan ürün SİLİNMEZ — grup bir etikettir', () => {
    expect(body).not.toMatch(/delete from public\.products/i);
  });

  test('boş liste güvenli çalışır', () => {
    // `= any(null)` hiçbir satırla eşleşmez ve temizleme adımı sessizce
    // hiçbir şey yapmazdı; coalesce ile boş dizi garanti ediliyor.
    expect(body).toMatch(/coalesce\(p_product_ids, '\{\}'::uuid\[\]\)/i);
  });

  test('yalnız kendi grubum düzenlenebilir', () => {
    expect(body).toMatch(/g\.owner_org_id = v_me/i);
    expect(body).toMatch(/GROUP_NOT_FOUND/);
  });

  test('yalnız kendi ürünlerim etkilenir', () => {
    const updates = body.match(/update public\.products[\s\S]*?;/gi) ?? [];
    expect(updates.length).toBe(2);
    for (const u of updates) expect(u).toMatch(/owner_org_id = v_me/i);
  });
});

describe('search_path sabitlenmiş (kilitli kural 4)', () => {
  for (const fn of ['assign_products_to_group', 'set_group_products']) {
    test(fn, () => {
      expect(sql).toMatch(
        new RegExp(
          `create or replace function public\\.${fn}[\\s\\S]*?set search_path = public`,
          'i',
        ),
      );
    });
  }
});

describe('ürün kodu (model) benzersiz DEĞİL', () => {
  test('owner+code benzersizlik kısıtı kaldırıldı', () => {
    // Yanlış varsayım: kodun bir ürünü tek başına tanımladığı. Mobilyada
    // "Havana" bir MODEL ADIDIR; aynı model altında koltuk, sehpa, puf olur.
    expect(loadMigrationSql()).toMatch(
      /alter table public.products drop constraint if exists products_owner_code_key/i,
    );
  });

  test('arama indeksi KALIYOR — yalnız benzersizlik gitti', () => {
    expect(loadMigrationSql()).toMatch(/create index if not exists products_owner_code_idx/i);
  });
});
