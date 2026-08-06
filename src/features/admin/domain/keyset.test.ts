import { describe, expect, test } from 'vitest';
import { keysetFilter, nextCursor } from './keyset';

const cursor = { createdAt: '2026-08-06T10:00:00Z', id: 'aaa' };

describe('keysetFilter', () => {
  test('eşit zaman damgalarını da kapsar', () => {
    // Sadece created_at.lt olsaydı aynı damgalı satırlar sayfa sınırında atlanırdı.
    const f = keysetFilter(cursor);
    expect(f).toContain('created_at.lt.2026-08-06T10:00:00Z');
    expect(f).toContain('and(created_at.eq.2026-08-06T10:00:00Z,id.lt.aaa)');
  });
});

describe('nextCursor', () => {
  const rows = [
    { createdAt: '2026-08-06T10:00:02Z', id: 'a' },
    { createdAt: '2026-08-06T10:00:01Z', id: 'b' },
  ];

  test('sayfa doluysa son satırdan imleç üretir', () => {
    expect(nextCursor(rows, 2)).toEqual({ createdAt: '2026-08-06T10:00:01Z', id: 'b' });
  });

  test('sayfa yarım kaldıysa imleç yok — son sayfa', () => {
    expect(nextCursor(rows, 25)).toBeUndefined();
  });

  test('boş sonuçta imleç yok', () => {
    expect(nextCursor([], 25)).toBeUndefined();
  });
});
