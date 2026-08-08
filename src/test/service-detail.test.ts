/**
 * SSH detayı — durum geçmişi ve fotoğraf deposunun şema garantileri.
 *
 * İki şeyi koruyor:
 *   1. Geçmişin doğruluğu — `from_status` UPDATE'ten ÖNCE alınmalı, yoksa her
 *      geçiş "X → X" diye kaydedilir (sipariş akışında yaşandı).
 *   2. Fotoğrafların gizliliği — servis fotoğrafı son müşterinin evini gösterir;
 *      bucket public olursa bağlantıyı bilen herkes görür.
 */
import { describe, expect, test } from 'vitest';
import { functionBody, loadMigrationSql, policiesFor, schemaFromMigrations } from './sqlSchema';

const sql = loadMigrationSql();
const tables = schemaFromMigrations();

describe('ssh_status_logs', () => {
  const columns = tables.get('ssh_status_logs') ?? new Set<string>();

  test('tablo tanımlı', () => {
    expect(columns.size).toBeGreaterThan(0);
  });

  test('RLS anahtarı denormalize taşınır (A16)', () => {
    // ssh_requests'e join eden bir politika, her satır için ikinci bir sorgu demekti.
    expect(columns.has('manufacturer_org_id')).toBe(true);
    expect(columns.has('retailer_org_id')).toBe(true);
  });

  test('geçişin iki ucu ve notu saklanır', () => {
    for (const col of ['from_status', 'to_status', 'note', 'actor_org_id']) {
      expect(columns.has(col), `ssh_status_logs.${col} bekleniyordu`).toBe(true);
    }
  });

  test('yalnız SELECT politikası var — geçmiş istemciden yazılamaz', () => {
    const policies = policiesFor('ssh_status_logs');
    expect(policies.length).toBe(1);
    expect(policies[0]).toMatch(/for select/i);
    expect(policies[0]).toMatch(/manufacturer_org_id = \(select public\.get_my_org_id\(\)\)/i);
  });

  test('talep silinince geçmişi de gider', () => {
    expect(sql).toMatch(/ssh_id uuid not null references public\.ssh_requests\(id\) on delete cascade/i);
  });
});

describe('advance_ssh_status geçmiş kaydı', () => {
  const body = functionBody('advance_ssh_status');

  test('önceki durum UPDATE ÖNCESİNDE yakalanır', () => {
    // `returning * into v_row` sonrası v_row.status YENİ durumdur; oradan
    // okumak her geçişi "bekliyor → bekliyor" diye kaydederdi.
    const beforeUpdate = body.slice(0, body.search(/update public\.ssh_requests/i));
    expect(beforeUpdate).toMatch(/v_from := v_row\.status;/i);
  });

  test('log satırı yazılır', () => {
    expect(body).toMatch(/insert into public\.ssh_status_logs/i);
    expect(body).toMatch(/v_from, p_status/);
  });

  test('kapalı talep ilerletilemez', () => {
    expect(body).toMatch(/SSH_CLOSED/);
  });

  test('akışı üretici yürütür, iptali her iki taraf yapabilir', () => {
    expect(body).toMatch(/if p_status = 'iptal' then/i);
    expect(body).toMatch(/elsif v_row\.manufacturer_org_id <> v_me then/i);
  });

  test('eski imza DROP edilmiş — overload bırakılmamış (kilitli kural 6)', () => {
    expect(sql).toMatch(
      /drop function if exists public\.advance_ssh_status\(uuid, public\.ssh_status\);/i,
    );
  });
});

describe('servis fotoğrafı deposu', () => {
  test('bucket PRIVATE', () => {
    // Ürün görselinin aksine: servis fotoğrafı son müşterinin evini gösterir.
    expect(sql).toMatch(/'service-photos', 'service-photos', false/i);
  });

  test('çakışmada da private kalır', () => {
    // `on conflict do nothing` olsaydı, daha önce public açılmış bir bucket
    // sessizce public kalırdı.
    expect(sql).toMatch(/on conflict \(id\) do update[\s\S]*?set public = false/i);
  });

  test('erişim İLİŞKİ düzeyinde kurulur — iki taraf da görebilmeli', () => {
    const policies = [...sql.matchAll(/create policy "service_photos_[^"]+"[^;]+;/gi)].map(
      (m) => m[0],
    );
    expect(policies.length).toBe(3); // read, write, delete
    for (const p of policies) {
      expect(p).toMatch(/is_my_relationship\(\(\(storage\.foldername\(name\)\)\[1\]\)::uuid\)/i);
    }
  });

  test('is_my_relationship küme değil EXISTS döner (A16)', () => {
    const body = functionBody('is_my_relationship');
    expect(body).toMatch(/select exists/i);
    expect(body).not.toMatch(/my_relationship_ids/i);
  });
});

describe('set_ssh_images', () => {
  const body = functionBody('set_ssh_images');

  test('yalnız ilişkinin tarafı yazabilir', () => {
    expect(body).toMatch(/v_me not in \(v_row\.manufacturer_org_id, v_row\.retailer_org_id\)/i);
    expect(body).toMatch(/FORBIDDEN/);
  });

  test('kapalı talebe fotoğraf eklenmez', () => {
    expect(body).toMatch(/SSH_CLOSED/);
  });

  test('fotoğraf sayısı sunucuda sınırlanır', () => {
    expect(body).toMatch(/TOO_MANY_IMAGES/);
  });
});

describe('açılış kaydı', () => {
  test('trigger ile yazılır — zaman çizelgesi ilk adımı eksik kalmaz', () => {
    expect(sql).toMatch(/create trigger ssh_requests_log_created/i);
    expect(functionBody('log_ssh_created')).toMatch(/from_status[\s\S]*?null, new\.status/i);
  });

  test('mevcut talepler için geriye dönük yazılır', () => {
    expect(sql).toMatch(/where not exists \(select 1 from public\.ssh_status_logs l/i);
  });
});
