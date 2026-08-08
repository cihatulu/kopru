/**
 * Bayi daveti — şema tarafı garantileri.
 *
 * Davet, sistemin TEK anonim yazma yoludur: token'ı olan herkes org açabilir,
 * ilişki kurabilir, giriş hesabı yaratabilir. Bu yüzden buradaki korumaların
 * her biri, kaybolduğunda somut bir açığa dönüşür.
 */
import { describe, expect, test } from 'vitest';
import { functionBody, loadMigrationSql, policiesFor, schemaFromMigrations } from './sqlSchema';

const sql = loadMigrationSql();
const tables = schemaFromMigrations();

describe('invitations tablosu', () => {
  const columns = tables.get('invitations') ?? new Set<string>();

  test('tablo tanımlı', () => {
    expect(columns.size).toBeGreaterThan(0);
  });

  test('durum kolonları var — durum TÜRETİLİR, saklanmaz', () => {
    // `status` kolonu bilerek YOK: "süresi doldu"yu yazacak bir job olmadığı
    // için saklanan durum zamanla yalan söylerdi (bkz. domain/invitation.ts).
    for (const col of ['used_at', 'revoked_at', 'expires_at', 'used_by_org_id']) {
      expect(columns.has(col), `invitations.${col} bekleniyordu`).toBe(true);
    }
    expect(columns.has('status')).toBe(false);
  });

  test('token UNIQUE — çakışan iki davet aynı linkle açılamaz', () => {
    expect(sql).toMatch(/token text not null unique/i);
  });

  test('token sunucuda üretilir, istemciden gelmez', () => {
    expect(functionBody('create_invitation')).toMatch(/gen_random_uuid\(\)/i);
  });

  test('token üretimi search_path dışı eklentiye bağlı DEĞİL', () => {
    // Canlıda yaşandı: gen_random_bytes pgcrypto'dadır ve Supabase onu
    // `extensions` şemasına kurar; `search_path = public` altında görünmez.
    // Çekirdek gen_random_uuid() bu tuzağı tamamen ortadan kaldırır.
    expect(functionBody('create_invitation')).not.toMatch(/gen_random_bytes/i);
  });

  test('token URL-güvenli — tireler atılır, hex kalır', () => {
    expect(functionBody('create_invitation')).toMatch(/replace\(gen_random_uuid\(\)::text/i);
  });

  test('keyset sayfalama indeksi var (A17)', () => {
    expect(sql).toMatch(
      /create index invitations_inviter_idx\s+on public\.invitations \(inviter_org_id, created_at desc, id desc\)/i,
    );
  });
});

describe('invitations RLS', () => {
  const policies = policiesFor('invitations');

  test('RLS açık', () => {
    expect(sql).toMatch(/alter table public\.invitations enable row level security/i);
  });

  test('yalnız SELECT politikası var — istemci davet YAZAMAZ', () => {
    // INSERT/UPDATE politikası olsaydı istemci kendi token'ını uydurabilir,
    // süresi dolmuş bir daveti diriltebilirdi. Tek yol RPC'dir.
    expect(policies.length).toBe(1);
    expect(policies[0]).toMatch(/for select/i);
  });

  test('davetleri yalnız gönderen org görür', () => {
    expect(policies[0]).toMatch(/inviter_org_id = \(select public\.get_my_org_id\(\)\)/i);
  });

  test('anonim SELECT politikası YOK — token tablo taramasıyla bulunamaz', () => {
    // Kabul akışı service role ile Edge Function'da çalışır; tablo public değildir.
    expect(policies[0]).not.toMatch(/\banon\b/i);
    expect(policies[0]).not.toMatch(/using \(true\)/i);
  });
});

describe('create_invitation yetkisi', () => {
  const body = functionBody('create_invitation');

  test('search_path sabitlenmiş (kilitli kural 4)', () => {
    expect(sql).toMatch(
      /create or replace function public\.create_invitation[\s\S]*?set search_path = public/i,
    );
  });

  test('yalnız ABONELER davet gönderir', () => {
    // Misafirin davet edebilmesi, abonelik kapısını tamamen delerdi.
    expect(body).toMatch(/if not v_me\.is_subscriber then/i);
    expect(body).toMatch(/NOT_SUBSCRIBER/);
  });

  test('muhasebeci davet gönderemez', () => {
    expect(body).toMatch(/v_role not in \('owner', 'staff'\)/i);
  });

  test('kendi VKN sine davet oluşturulamaz', () => {
    expect(body).toMatch(/SELF_REFERENCE/);
  });

  test('geçerlilik süresi sunucuda sınırlanır', () => {
    // İstemciden gelen 3650 gün, süresiz link demek olurdu.
    expect(body).toMatch(/least\(greatest\(/i);
  });

  test('işlem denetim kaydına yazılır', () => {
    expect(body).toMatch(/insert into public\.system_logs/i);
  });
});

describe('revoke_invitation güvenliği', () => {
  const body = functionBody('revoke_invitation');

  test('yalnız kendi davetini iptal edebilir', () => {
    expect(body).toMatch(/inviter_org_id = public\.get_my_org_id\(\)/i);
  });

  test('yarış koşuluna karşı satırı kilitler', () => {
    expect(body).toMatch(/for update/i);
  });

  test('kullanılmış davet iptal edilemez', () => {
    // İlişki zaten kurulmuş; iptal listede yanlış bilgi gösterirdi.
    expect(body).toMatch(/ALREADY_USED/);
  });
});
