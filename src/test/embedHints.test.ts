/**
 * PostgREST gömme (embed) ipuçlarının bileşik yabancı anahtarlarla uyumu.
 *
 * NEDEN VAR: A15 gereği bazı yabancı anahtarlar bileşiktir
 * ((org_id, kind) → organizations(id, kind)). PostgREST bunları KOLON adından
 * çözemez; ipucu kısıt adıyla verilmelidir.
 *
 * Bu hatanın tehlikesi sessiz olması: `tsc` geçer, ESLint geçer, birim testler
 * yeşil kalır — liste yalnızca CANLIDA boş görünür. `relationships` ve
 * `announcements` sorgularında tam olarak bu yaşandı (ERROR_PROTOCOLS #21).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { loadMigrationSql } from './sqlSchema';

/** Migration'lardaki bileşik FK'ler: tablo → o FK'de yer alan org kolonları. */
function compositeForeignKeys(): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  const sql = loadMigrationSql();

  for (const stmt of sql.split(';')) {
    const table = /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)/i.exec(stmt)?.[1];
    if (!table) continue;

    // foreign key (a, b) references public.organizations(id, kind)
    for (const m of stmt.matchAll(/foreign\s+key\s*\(([^)]*,[^)]*)\)\s*references/gi)) {
      const cols = m[1]!.split(',').map((c) => c.trim());
      const set = result.get(table) ?? new Set<string>();
      cols.forEach((c) => set.add(c));
      result.set(table, set);
    }
  }
  return result;
}

/**
 * Feature başına birleşik api kaynağı.
 *
 * Dosya başına bakmak YETMEZ: kolon listeleri sık sık `columns.ts` gibi ayrı bir
 * dosyada durur ve orada hiç `.from()` yoktur. Dosya bazlı tarama tam da bu
 * yüzden admin ilişki listesindeki kırık gömmeyi kaçırdı.
 */
function apiSourcesByFeature(): Map<string, string> {
  const root = join(process.cwd(), 'src', 'features');
  const out = new Map<string, string>();

  for (const feature of readdirSync(root, { withFileTypes: true })) {
    if (!feature.isDirectory()) continue;
    const dir = join(root, feature.name, 'api');
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    const merged = entries
      .filter((f) => f.endsWith('.ts'))
      .map((f) => readFileSync(join(dir, f), 'utf8'))
      .join('\n');
    if (merged) out.set(feature.name, merged);
  }
  return out;
}

const composite = compositeForeignKeys();

describe('bileşik FK gömmeleri kısıt adıyla yazılır', () => {
  test('en az bir bileşik FK bulundu — tarama gerçekten çalışıyor', () => {
    // Bu olmazsa test hiçbir şey doğrulamadan yeşil yanardı.
    expect(composite.get('relationships')?.has('retailer_org_id')).toBe(true);
    expect(composite.get('announcements')?.has('owner_org_id')).toBe(true);
  });

  for (const [feature, source] of apiSourcesByFeature()) {
    const short = `features/${feature}/api`;

    // Feature'ın dokunduğu tablolar.
    const tables = [...source.matchAll(/\.from\(\s*['"`](\w+)['"`]/g)].map((m) => m[1]!);
    if (tables.length === 0) continue;

    // alias:kolon( biçimindeki gömme ipuçları (kısıt adı kullananlar `!` içerir).
    const hints = [...source.matchAll(/\b(\w+):(\w+_org_id)\(/g)].map((m) => m[2]!);
    if (hints.length === 0) continue;

    test(`${short} — kolon adıyla gömme, bileşik FK'ye çarpmıyor`, () => {
      const offenders: string[] = [];
      for (const table of tables) {
        const compositeCols = composite.get(table);
        if (!compositeCols) continue;
        for (const hint of hints) {
          if (compositeCols.has(hint)) offenders.push(`${table}.${hint}`);
        }
      }

      expect(
        offenders,
        `Bileşik FK kolon adıyla gömülemez. Kısıt adı kullan:\n` +
          `  alias:organizations!<tablo>_<kolon>_<kind_kolonu>_fkey(...)\n` +
          `Sorunlu: ${offenders.join(', ')}`,
      ).toEqual([]);
    });
  }
});
