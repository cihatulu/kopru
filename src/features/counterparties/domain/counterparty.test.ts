import { describe, expect, test } from 'vitest';
import {
  counterpartyNoun,
  counterpartyTitle,
  isIncomingRequest,
  isManufacturerSide,
  isOutgoingRequest,
  otherParty,
  pendingExplanation,
  type Edge,
  type Party,
} from './counterparty';

const MFR = 'org-mfr';
const RTL = 'org-rtl';

const party = (id: string, name: string): Party => ({
  id,
  companyName: name,
  vknTc: '1234567890',
  isSubscriber: true,
  phone: null,
  email: null,
});

const edge = (over: Partial<Edge> = {}): Edge => ({
  id: 'rel-1',
  status: 'active',
  discountRate: 0,
  createdAt: '2026-08-06T00:00:00Z',
  initiatedByOrgId: MFR,
  manufacturerOrgId: MFR,
  manufacturer: party(MFR, 'Üretici A'),
  retailer: party(RTL, 'Perakendeci B'),
  ...over,
});

describe('otherParty', () => {
  test('üretici bakınca perakendeciyi görür', () => {
    expect(otherParty(edge(), MFR).companyName).toBe('Perakendeci B');
  });

  test('perakendeci bakınca üreticiyi görür', () => {
    expect(otherParty(edge(), RTL).companyName).toBe('Üretici A');
  });
});

describe('isManufacturerSide', () => {
  test('iskonto yetkisi yalnız üretici tarafındadır', () => {
    expect(isManufacturerSide(edge(), MFR)).toBe(true);
    expect(isManufacturerSide(edge(), RTL)).toBe(false);
  });
});

describe('gelen / giden istek ayrımı', () => {
  const pending = edge({ status: 'pending', initiatedByOrgId: MFR });

  test('isteği başlatan için giden istektir', () => {
    expect(isOutgoingRequest(pending, MFR)).toBe(true);
    expect(isIncomingRequest(pending, MFR)).toBe(false);
  });

  test('karşı taraf için gelen istektir', () => {
    expect(isIncomingRequest(pending, RTL)).toBe(true);
    expect(isOutgoingRequest(pending, RTL)).toBe(false);
  });

  test('aktif kenar ne gelen ne giden istektir', () => {
    expect(isIncomingRequest(edge(), RTL)).toBe(false);
    expect(isOutgoingRequest(edge(), MFR)).toBe(false);
  });

  test('pasif kenar istek sayılmaz', () => {
    const passive = edge({ status: 'passive' });
    expect(isIncomingRequest(passive, RTL)).toBe(false);
    expect(isOutgoingRequest(passive, MFR)).toBe(false);
  });
});

describe('etiketler', () => {
  test('üretici müşterilerini, perakendeci tedarikçilerini yönetir', () => {
    expect(counterpartyTitle('manufacturer')).toBe('Müşterilerim');
    expect(counterpartyTitle('retailer')).toBe('Tedarikçilerim');
    expect(counterpartyNoun('manufacturer')).toBe('perakendeci');
    expect(counterpartyNoun('retailer')).toBe('üretici');
  });
});

describe('pendingExplanation', () => {
  const pending = edge({ status: 'pending', initiatedByOrgId: MFR });

  test('gelen istekte karşı tarafın niyeti anlatılır', () => {
    expect(pendingExplanation(pending, RTL)).toMatch(/eklemek istiyor/);
  });

  test('giden istekte neden beklendiği anlatılır', () => {
    // Kullanıcı "neden hemen bağlanmadı?" sorusunu sormamalı.
    expect(pendingExplanation(pending, MFR)).toMatch(/karşı taraf da abone/i);
  });
});
