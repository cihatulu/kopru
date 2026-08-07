import { describe, expect, test } from 'vitest';
import {
  LEAD_STATUS_META,
  isClosedLead,
  isManuallySettable,
  nextLeadStatus,
  type LeadStatus,
} from './lead';

describe('takip zinciri', () => {
  test('yeni -> arandı -> ilgileniyor', () => {
    expect(nextLeadStatus('new')).toBe('contacted');
    expect(nextLeadStatus('contacted')).toBe('interested');
  });

  test('kapalı adaylardan ilerleme yok', () => {
    expect(nextLeadStatus('converted')).toBeNull();
    expect(nextLeadStatus('rejected')).toBeNull();
  });
});

describe('isManuallySettable', () => {
  test('converted elle işaretlenemez', () => {
    // Dönüşüm, aday sisteme kaydolduğunda trigger ile olur. Elle işaretlemek
    // gerçekte kaydolmamış bir adayı müşteri göstererek raporu bozardı.
    expect(isManuallySettable('converted')).toBe(false);
  });

  test('diğer durumlar elle ayarlanabilir', () => {
    for (const s of ['new', 'contacted', 'interested', 'rejected'] as LeadStatus[]) {
      expect(isManuallySettable(s)).toBe(true);
    }
  });
});

describe('isClosedLead', () => {
  test('dönüşen ve olumsuz adaylar kapalıdır', () => {
    expect(isClosedLead('converted')).toBe(true);
    expect(isClosedLead('rejected')).toBe(true);
    expect(isClosedLead('new')).toBe(false);
  });
});

describe('etiketler', () => {
  test('her durumun Türkçe karşılığı var', () => {
    const all: LeadStatus[] = ['new', 'contacted', 'interested', 'converted', 'rejected'];
    for (const s of all) {
      expect(LEAD_STATUS_META[s].label.length).toBeGreaterThan(0);
      expect(LEAD_STATUS_META[s].className).toMatch(/bg-/);
    }
  });
});
