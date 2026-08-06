/**
 * Migration dosyalarını okuyup şema/politika çıkaran test yardımcısı.
 *
 * Statik testlerin (price-isolation, rls) ortak tabanı — veritabanı gerektirmez,
 * bu yüzden CI'da her zaman çalışır ve A4/A16/A17 kurallarını sürekli korur.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

/**
 * SQL yorumlarını siler.
 * ZORUNLU: yorum metinleri noktalı virgül içerebilir
 * (ör. "-- Köprüden geçen tek fiyat buydu; tek DB'de ..."), bu yüzden ifade
 * bölmeden ÖNCE yorumlar temizlenmezse `split(';')` ifadeyi ortadan keser.
 */
export function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');
}

/** Tüm migration'ların birleşik SQL'i (yorumlar temizlenmiş). */
export function loadMigrationSql(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => stripSqlComments(readFileSync(join(MIGRATIONS_DIR, f), 'utf8')))
    .join('\n');
}

/** Bir `create table` ifadesinin gövdesinden kolon adlarını çıkarır. */
function columnsOf(statement: string): string[] {
  const open = statement.indexOf('(');
  const close = statement.lastIndexOf(')');
  if (open === -1 || close <= open) return [];

  return statement
    .slice(open + 1, close)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => /^"?([a-z_][a-z0-9_]*)"?\s/i.exec(line)?.[1] ?? '')
    .filter(Boolean)
    .filter((name) => !['constraint', 'primary', 'unique', 'foreign', 'check'].includes(name));
}

/** Migration'lardaki tüm tabloların kolon haritası. */
export function schemaFromMigrations(): Map<string, Set<string>> {
  const tables = new Map<string, Set<string>>();

  for (const stmt of loadMigrationSql().split(';')) {
    const created = /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)/i.exec(stmt);
    if (created) {
      const name = created[1]!;
      const set = tables.get(name) ?? new Set<string>();
      columnsOf(stmt).forEach((c) => set.add(c));
      tables.set(name, set);
      continue;
    }

    const altered =
      /alter\s+table\s+(?:public\.)?(\w+)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?(\w+)/i.exec(
        stmt,
      );
    if (altered) {
      const set = tables.get(altered[1]!) ?? new Set<string>();
      set.add(altered[2]!);
      tables.set(altered[1]!, set);
    }
  }

  return tables;
}

/** Migration'lardaki tüm `create policy` ifadeleri. */
export function policiesFromMigrations(): string[] {
  return [...loadMigrationSql().matchAll(/create policy[^;]+;/gi)].map((m) => m[0]);
}

/** Belirli bir tabloya ait politikalar. */
export function policiesFor(table: string): string[] {
  return policiesFromMigrations().filter((p) =>
    new RegExp(`on public\\.${table}\\b`, 'i').test(p),
  );
}

/**
 * Bir fonksiyonun ETKİN gövdesi — yani SON `create or replace` tanımı.
 *
 * ZORUNLU: migration'lar sırayla uygulandığı için veritabanında son tanım
 * geçerlidir. İlk tanımı okumak iki yönde de yanıltır: sonraki bir migration
 * hatayı düzeltmişse test boşuna kırmızı yanar; daha kötüsü, sonraki bir
 * migration bir şeyi BOZMUŞSA test eski sağlam sürümü okuyup yeşil kalır.
 */
export function functionBody(name: string): string {
  const all = [
    ...loadMigrationSql().matchAll(
      new RegExp(
        `create\\s+or\\s+replace\\s+function\\s+public\\.${name}\\b[\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$;`,
        'gi',
      ),
    ),
  ];
  return all.length ? (all[all.length - 1]![1] ?? '') : '';
}
