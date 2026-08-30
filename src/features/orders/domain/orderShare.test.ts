import { describe, expect, test } from 'vitest';
import { buildOrderReferenceCode, buildOrderTrackingMessage, trackingUrl } from './orderShare';
import { buildWhatsAppLink, normalizePhone } from '@/lib/whatsapp';

describe('normalizePhone', () => {
  test('rakam dışındaki her şeyi atar', () => {
    expect(normalizePhone('+90 (532) 111-22 33')).toBe('905321112233');
  });
});

describe('buildWhatsAppLink', () => {
  test('numara varsa doğrudan kişiye açılır', () => {
    expect(buildWhatsAppLink({ phone: '0532 111 2233', message: 'merhaba' })).toBe(
      'https://api.whatsapp.com/send?phone=905321112233&text=merhaba',
    );
  });

  test('numara yoksa kişi seçtiren link üretilir', () => {
    expect(buildWhatsAppLink({ message: 'merhaba' })).toBe('https://api.whatsapp.com/send?text=merhaba');
  });

  test('mesaj URL için kodlanır', () => {
    expect(buildWhatsAppLink({ message: 'a b&c' })).toContain('a%20b%26c');
  });
});

describe('trackingUrl', () => {
  test('origin sonundaki eğik çizgi iki kez yazılmaz', () => {
    expect(trackingUrl('https://x.com/', 'tok')).toBe('https://x.com/takip/tok');
    expect(trackingUrl('https://x.com', 'tok')).toBe('https://x.com/takip/tok');
  });
});

describe('buildOrderTrackingMessage', () => {
  test('takip linkini gömer', () => {
    const msg = buildOrderTrackingMessage({
      origin: 'https://demo.example.com',
      orderToken: 'abc-123',
      customerName: 'Ayşe',
    });
    expect(msg).toContain('Merhaba Ayşe,');
    expect(msg).toContain('https://demo.example.com/takip/abc-123');
  });

  test('müşteri adı yoksa selamlama yazılmaz', () => {
    const msg = buildOrderTrackingMessage({ origin: 'https://x.com', orderToken: 't' });
    expect(msg.startsWith('siparişinizi')).toBe(true);
  });
});

describe('buildOrderReferenceCode', () => {
  test('tarih ve sipariş numarasından üretilir', () => {
    expect(buildOrderReferenceCode('260813-0001', '2026-08-13T08:24:00Z')).toBe(
      'SIP-20260813-260813-0001',
    );
  });

  test('tarih boşsa uydurma tarih yazılmaz', () => {
    expect(buildOrderReferenceCode('X-1', '')).toBe('SIP-00000000-X-1');
  });
});
