import { describe, expect, test } from 'vitest';
import {
  INVITE_STATE_LABEL,
  daysLeft,
  invitedKind,
  inviteNoun,
  inviteState,
  inviteUrl,
  isActionable,
  type Invitation,
} from './invitation';
import { ORG_KIND } from '@/constants';

const NOW = new Date('2026-08-08T12:00:00Z');

function make(over: Partial<Invitation> = {}): Invitation {
  return {
    id: 'i1',
    token: 'abc',
    companyName: null,
    email: null,
    phone: null,
    authorizedName: null,
    vknTc: null,
    discountRate: 0,
    expiresAt: '2026-08-22T12:00:00Z',
    usedAt: null,
    revokedAt: null,
    createdAt: '2026-08-08T12:00:00Z',
    ...over,
  };
}

describe('inviteState', () => {
  test('yeni davet bekliyor', () => {
    expect(inviteState(make(), NOW)).toBe('pending');
  });

  test('kullanılan davet tamamlandı', () => {
    expect(inviteState(make({ usedAt: '2026-08-10T00:00:00Z' }), NOW)).toBe('used');
  });

  test('iptal edilen davet', () => {
    expect(inviteState(make({ revokedAt: '2026-08-09T00:00:00Z' }), NOW)).toBe('revoked');
  });

  test('geçmiş tarihli davet süresi dolmuş sayılır', () => {
    expect(inviteState(make({ expiresAt: '2026-08-07T12:00:00Z' }), NOW)).toBe('expired');
  });

  test('tam sınırda (expires_at = now) süresi dolmuştur', () => {
    // `<=` seçildi: saniyesi gelmiş bir davetin hâlâ kabul edilebilir görünmesi,
    // sunucunun reddedeceği bir linki kullanıcıya "geçerli" diye göstermek olurdu.
    expect(inviteState(make({ expiresAt: NOW.toISOString() }), NOW)).toBe('expired');
  });

  test('kullanılmış VE süresi dolmuş davet "kullanıldı" gösterir', () => {
    // Kullanıcı için anlamlı bilgi budur; süre bilgisi artık önemsiz.
    const inv = make({ usedAt: '2026-08-09T00:00:00Z', expiresAt: '2026-08-07T00:00:00Z' });
    expect(inviteState(inv, NOW)).toBe('used');
  });

  test('iptal edilmiş VE süresi dolmuş davet "iptal" gösterir', () => {
    const inv = make({ revokedAt: '2026-08-08T00:00:00Z', expiresAt: '2026-08-07T00:00:00Z' });
    expect(inviteState(inv, NOW)).toBe('revoked');
  });

  test('her durumun bir etiketi var', () => {
    for (const state of ['pending', 'used', 'revoked', 'expired'] as const) {
      expect(INVITE_STATE_LABEL[state]).toBeTruthy();
    }
  });
});

describe('isActionable', () => {
  test('yalnız bekleyen davet için işlem yapılır', () => {
    expect(isActionable('pending')).toBe(true);
    for (const s of ['used', 'revoked', 'expired'] as const) {
      expect(isActionable(s)).toBe(false);
    }
  });
});

describe('inviteUrl', () => {
  test('token yolun sonuna eklenir', () => {
    expect(inviteUrl('abc123', 'https://kopru.app')).toBe('https://kopru.app/davet/abc123');
  });

  test('origin sonundaki eğik çizgi ikilenmez', () => {
    expect(inviteUrl('abc', 'https://kopru.app/')).toBe('https://kopru.app/davet/abc');
  });

  test('token URL için kaçışlanır', () => {
    // base64url token normalde kaçış gerektirmez ama bu bir varsayım olarak
    // bırakılmaz — kodlama şeması değişirse link sessizce bozulurdu.
    expect(inviteUrl('a+b/c', 'https://x.com')).toBe('https://x.com/davet/a%2Bb%2Fc');
  });
});

describe('invitedKind — A15', () => {
  test('üretici perakendeci davet eder', () => {
    expect(invitedKind(ORG_KIND.manufacturer)).toBe(ORG_KIND.retailer);
  });

  test('perakendeci üretici davet eder', () => {
    expect(invitedKind(ORG_KIND.retailer)).toBe(ORG_KIND.manufacturer);
  });

  test('etiketler taraf tipine göre değişir', () => {
    expect(inviteNoun(ORG_KIND.manufacturer)).toBe('bayi');
    expect(inviteNoun(ORG_KIND.retailer)).toBe('tedarikçi');
  });
});

describe('daysLeft', () => {
  test('14 günlük davet 14 gün gösterir', () => {
    expect(daysLeft(make(), NOW)).toBe(14);
  });

  test('kısmi gün yukarı yuvarlanır', () => {
    // 12 saat kalan bir davet "0 gün" değil "1 gün" göstermeli.
    expect(daysLeft(make({ expiresAt: '2026-08-09T00:00:00Z' }), NOW)).toBe(1);
  });

  test('geçmiş tarih negatife düşmez', () => {
    expect(daysLeft(make({ expiresAt: '2026-08-01T00:00:00Z' }), NOW)).toBe(0);
  });
});
