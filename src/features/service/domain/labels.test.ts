import { describe, expect, test } from 'vitest';
import {
  RETURN_STATUS_META,
  SSH_STATUS_META,
  isSshClosed,
  nextSshStatus,
} from './labels';
import type { ReturnStatus, SshStatus } from '../api/shared';

describe('SSH akışı', () => {
  test('zincir sırayla ilerler', () => {
    expect(nextSshStatus('bekliyor')).toBe('inceleniyor');
    expect(nextSshStatus('inceleniyor')).toBe('parca_gonderildi');
    expect(nextSshStatus('parca_gonderildi')).toBe('tamamlandi');
  });

  test('kapalı durumlardan ilerleme yok', () => {
    expect(nextSshStatus('tamamlandi')).toBeNull();
    expect(nextSshStatus('iptal')).toBeNull();
  });

  test('isSshClosed', () => {
    expect(isSshClosed('tamamlandi')).toBe(true);
    expect(isSshClosed('iptal')).toBe(true);
    expect(isSshClosed('bekliyor')).toBe(false);
  });
});

describe('etiketler', () => {
  test('her SSH durumunun Türkçe etiketi var', () => {
    const all: SshStatus[] = [
      'bekliyor', 'inceleniyor', 'parca_gonderildi', 'tamamlandi', 'iptal',
    ];
    for (const s of all) {
      expect(SSH_STATUS_META[s].label.length).toBeGreaterThan(0);
      expect(SSH_STATUS_META[s].className).toMatch(/bg-/);
    }
  });

  test('her iade durumunun Türkçe etiketi var', () => {
    for (const s of ['pending', 'approved', 'rejected'] as ReturnStatus[]) {
      expect(RETURN_STATUS_META[s].label.length).toBeGreaterThan(0);
    }
  });
});
