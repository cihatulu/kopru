import { describe, expect, it } from 'vitest';
import { sshCode } from './sshCode';

describe('sshCode', () => {
  it('tarihi ve id önekini birleştirir', () => {
    expect(sshCode('a1b2c3d4-0000-0000-0000-000000000000', '2026-08-12T10:30:00Z')).toBe(
      'SSH-20260812-A1B2',
    );
  });

  it('id yoksa sabit yer tutucu döner', () => {
    expect(sshCode('', '2026-08-12T10:30:00Z')).toBe('SSH-0000');
  });

  it('tarih yoksa uydurmaz, sıfırlar', () => {
    expect(sshCode('a1b2c3d4', '')).toBe('SSH-00000000-A1B2');
  });

  it('saat kısmı olmayan tarihi de kabul eder', () => {
    expect(sshCode('a1b2c3d4', '2026-01-05')).toBe('SSH-20260105-A1B2');
  });
});
