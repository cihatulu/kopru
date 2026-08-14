import { describe, expect, test } from 'vitest';
import { buildInviteMessage, toWhatsappNumber, whatsappShareUrl } from './inviteShare';

const input = {
  inviterName: 'adnan mobilya',
  userCode: '40000000003',
  sponsorVkn: '41671335404',
  password: 'Gecici1234',
  token: 'abc123',
  origin: 'https://kopru.app',
};

describe('toWhatsappNumber', () => {
  test('aynı numaranın üç yazımı da aynı sonuca çıkar', () => {
    // Kullanıcı "0532...", "532..." ve "90532..." diye yazıyor; üçü de geçerli.
    expect(toWhatsappNumber('5325630369')).toBe('905325630369');
    expect(toWhatsappNumber('05325630369')).toBe('905325630369');
    expect(toWhatsappNumber('905325630369')).toBe('905325630369');
  });

  test('boşluk ve ayraçlar temizlenir', () => {
    expect(toWhatsappNumber('0532 563 03 69')).toBe('905325630369');
    expect(toWhatsappNumber('+90 (532) 563-0369')).toBe('905325630369');
  });

  test('okunamayan numara null döner', () => {
    expect(toWhatsappNumber('')).toBeNull();
    expect(toWhatsappNumber('123')).toBeNull();
    expect(toWhatsappNumber('abc')).toBeNull();
  });
});

describe('buildInviteMessage', () => {
  test('misafir girişinin üç bilgisini birden taşır', () => {
    const msg = buildInviteMessage(input);
    expect(msg).toContain('41671335404');
    expect(msg).toContain('40000000003');
    expect(msg).toContain('Gecici1234');
    expect(msg).toContain('https://kopru.app/davet/abc123');
  });
});

describe('whatsappShareUrl', () => {
  test('mesaj URL için kodlanır', () => {
    const url = whatsappShareUrl('05325630369', 'merhaba dünya');
    expect(url).toBe('https://wa.me/905325630369?text=merhaba%20d%C3%BCnya');
  });

  test('numara okunamazsa bağlantı üretilmez', () => {
    // Boş bir WhatsApp sohbeti açmak "mesaj gitti" sanılmasına yol açardı.
    expect(whatsappShareUrl('123', 'merhaba')).toBeNull();
  });
});
