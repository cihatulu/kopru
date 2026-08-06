/**
 * Faz 4 — admin işlemlerinin şema tarafı garantileri.
 *
 * İki şeyi koruyor:
 *   1. Çift katmanlı plan gating (kilitli kural 15) — SQL ve TS modül listeleri
 *      sessizce ayrışırsa frontend'in kapattığı bir modülü sunucu açık bırakır.
 *   2. Yükseltmenin ilişkilere dokunmaması (ERROR_PROTOCOLS #15) — ürünün
 *      ticari vaadi bu; bozulursa misafirin geçmişi kaybolur.
 */
import { describe, expect, test } from 'vitest';
import { loadMigrationSql } from './sqlSchema';
import { PLAN, PLAN_MODULES, type Plan } from '@/constants';

const sql = loadMigrationSql();

/** `default_modules_for_plan` içindeki jsonb dizisini okur. */
function sqlModulesFor(plan: Plan): string[] {
  const match = new RegExp(`when '${plan}' then\\s*'(\\[[^\\]]*\\])'::jsonb`, 'i').exec(sql);
  expect(match, `${plan} için SQL modül listesi bulunamadı`).toBeTruthy();
  return JSON.parse(match![1]!) as string[];
}

describe('çift katmanlı plan gating — SQL ↔ TS parite', () => {
  for (const plan of Object.values(PLAN)) {
    test(`${plan} planının modülleri iki katmanda aynı`, () => {
      // Sıra fark etmez, küme aynı olmalı.
      expect([...sqlModulesFor(plan)].sort()).toEqual([...PLAN_MODULES[plan]].sort());
    });
  }

  test('planlar birbirini kapsar: free ⊂ basic ⊂ pro', () => {
    const free = new Set(PLAN_MODULES.free);
    const basic = new Set(PLAN_MODULES.basic);
    for (const m of free) expect(basic.has(m)).toBe(true);
    for (const m of basic) expect(PLAN_MODULES.pro).toContain(m);
  });
});

describe('upgrade_org_to_subscriber güvenliği', () => {
  const body =
    /create or replace function public\.upgrade_org_to_subscriber[\s\S]*?\$\$([\s\S]*?)\$\$;/i.exec(
      sql,
    )?.[1] ?? '';

  test('fonksiyon mevcut', () => {
    expect(body.length).toBeGreaterThan(0);
  });

  test('yalnız platform admini çağırabilir', () => {
    expect(body).toMatch(/if not public\.is_platform_admin\(\) then/i);
  });

  test('relationships tablosuna HİÇBİR yazma yok', () => {
    // Ürünün ticari vaadi: yükselen org eski sponsorunun müşterisi olarak kalır,
    // sipariş geçmişi ve cari bakiyesi olduğu yerde durur.
    expect(body).not.toMatch(/\b(insert into|update|delete from)\s+public\.relationships\b/i);
  });

  test('yeni organizasyon satırı AÇMAZ', () => {
    // Yeni org açsaydı misafirin geçmişi eski satırda kalır, kullanıcı boş panel görürdü.
    expect(body).not.toMatch(/insert into public\.organizations/i);
  });

  test('yarış koşuluna karşı satırı kilitler', () => {
    expect(body).toMatch(/for update/i);
  });

  test('zaten abone olan org tekrar yükseltilemez', () => {
    expect(body).toMatch(/ALREADY_SUBSCRIBER/);
  });

  test('modüller plan fonksiyonundan gelir, elle yazılmaz', () => {
    expect(body).toMatch(/enabled_modules = public\.default_modules_for_plan\(p_plan\)/i);
  });

  test('işlem denetim kaydına yazılır', () => {
    expect(body).toMatch(/insert into public\.system_logs/i);
  });
});

describe('ilişki sayacı (A17 — COUNT(*) yerine denormalize)', () => {
  test('organizations tablosunda sayaç kolonu var', () => {
    expect(sql).toMatch(/add column active_relationship_count int not null default 0/i);
  });

  test('sayaç trigger ile güncellenir', () => {
    expect(sql).toMatch(/create trigger relationships_sync_counters/i);
    expect(sql).toMatch(/after insert or update of status or delete on public\.relationships/i);
  });
});

describe('admin RPC yetki kontrolü', () => {
  const guarded = [
    'upgrade_org_to_subscriber',
    'downgrade_org_to_guest',
    'decide_subscription_request',
    'admin_set_relationship_status',
  ];

  for (const fn of guarded) {
    test(`${fn} admin olmayanı reddeder`, () => {
      const body =
        new RegExp(
          `create or replace function public\\.${fn}[\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$;`,
          'i',
        ).exec(sql)?.[1] ?? '';
      expect(body).toMatch(/is_platform_admin\(\)/);
      expect(body).toMatch(/FORBIDDEN/);
    });
  }
});
