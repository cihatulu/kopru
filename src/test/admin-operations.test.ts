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
import { functionBody, loadMigrationSql } from './sqlSchema';
import { PLAN, PLAN_MODULES, type Plan } from '@/constants';

const sql = loadMigrationSql();

/**
 * `default_modules_for_plan` içindeki son tanımın modül listesini okur.
 * Plan gating kaldırıldıktan sonra tüm planlar için aynı dizi döner.
 */
function sqlModulesFor(_plan: Plan): string[] {
  const body = functionBody('default_modules_for_plan');
  // Eski format: when 'pro' then '[...]'::jsonb
  const caseMatch = /when\s+'[^']+' then\s+'(\[[^\]]+\])'::jsonb/gi;
  const caseMatches = [...body.matchAll(caseMatch)];
  if (caseMatches.length > 0) {
    // Birden fazla when: planın kendi etiketini ara
    const planMatch = new RegExp(`when\\s+'${_plan}'\\s+then\\s+'(\\[[^\\]]+\\])'::jsonb`, 'i').exec(body);
    if (planMatch) return JSON.parse(planMatch[1]!) as string[];
  }
  // Yeni format: select '[...]'::jsonb (tüm planlar için tek liste)
  const selectMatch = /select\s+'(\[[^\]]+\])'::jsonb/i.exec(body);
  expect(selectMatch, `default_modules_for_plan içinde modül listesi bulunamadı`).toBeTruthy();
  // Trim whitespace in the JSON before parsing
  const raw = selectMatch![1]!.replace(/\s+/g, ' ');
  return JSON.parse(raw) as string[];
}

describe('tüm planlar tüm modüllere erişir (plan gating kaldırıldı)', () => {
  for (const plan of Object.values(PLAN)) {
    test(`${plan} planının modülleri iki katmanda aynı`, () => {
      // Plan gating kaldırıldı; tüm planlar için SQL ve TS aynı (tam) listeyi döner.
      expect([...sqlModulesFor(plan)].sort()).toEqual([...PLAN_MODULES[plan]].sort());
    });
  }

  test('tüm planlar aynı modül kümesine sahip', () => {
    // önceki free ⊂ basic ⊂ pro kuralı artık geçerli değil; hepsi eşit.
    const freeSet = new Set(PLAN_MODULES.free);
    const basicSet = new Set(PLAN_MODULES.basic);
    const proSet = new Set(PLAN_MODULES.pro);
    expect(freeSet.size).toBe(basicSet.size);
    expect(basicSet.size).toBe(proSet.size);
    for (const m of freeSet) {
      expect(basicSet.has(m)).toBe(true);
      expect(proSet.has(m)).toBe(true);
    }
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
