import { describe, expect, test } from 'vitest';
import {
  canSubmit,
  needsCredentials,
  submitLabel,
  verdictFor,
  verdictMessage,
  verdictTone,
  type OrgLookup,
} from './vknLookup';
import { ORG_KIND } from '@/constants';

const MY_VKN = '1111111111';
const OTHER = '2222222222';

function lookup(over: Partial<OrgLookup> = {}): OrgLookup {
  return {
    found: true,
    orgId: 'o1',
    companyName: 'Ege Mobilya',
    kind: ORG_KIND.retailer,
    isSubscriber: false,
    relationshipStatus: null,
    hasLogin: false,
    ...over,
  };
}

describe('verdictFor', () => {
  const mfr = ORG_KIND.manufacturer;

  test('sorgu henüz yapılmadıysa karar yok', () => {
    expect(verdictFor(null, mfr, MY_VKN, OTHER)).toBe('unknown');
  });

  test('kendi numarası her şeyden önce yakalanır', () => {
    // Sorgu sonucu gelmemiş olsa bile bu karar verilebilir.
    expect(verdictFor(null, mfr, MY_VKN, MY_VKN)).toBe('self');
    expect(verdictFor(lookup(), mfr, MY_VKN, ' 111-111 1111 ')).toBe('self');
  });

  test('sistemde yoksa yeni kayıt', () => {
    expect(verdictFor(lookup({ found: false }), mfr, MY_VKN, OTHER)).toBe('new');
  });

  test('misafir varsa mevcut kayda bağlanılır', () => {
    expect(verdictFor(lookup({ isSubscriber: false }), mfr, MY_VKN, OTHER)).toBe('existing-guest');
  });

  test('abone varsa bağlantı isteği gerekir', () => {
    expect(verdictFor(lookup({ isSubscriber: true }), mfr, MY_VKN, OTHER)).toBe(
      'existing-subscriber',
    );
  });

  test('zaten ilişkiliyse ayrı uyarı', () => {
    expect(verdictFor(lookup({ relationshipStatus: 'active' }), mfr, MY_VKN, OTHER)).toBe(
      'already-linked',
    );
    expect(verdictFor(lookup({ relationshipStatus: 'passive' }), mfr, MY_VKN, OTHER)).toBe(
      'already-linked',
    );
  });

  test('bekleyen istek ayrı bir durumdur', () => {
    expect(verdictFor(lookup({ relationshipStatus: 'pending' }), mfr, MY_VKN, OTHER)).toBe(
      'pending',
    );
  });

  test('aynı tipteki firma bağlanamaz (A15)', () => {
    expect(verdictFor(lookup({ kind: ORG_KIND.manufacturer }), mfr, MY_VKN, OTHER)).toBe(
      'kind-mismatch',
    );
  });

  test('tip uyuşmazlığı, ilişki durumundan ÖNCE gelir', () => {
    // Aynı tiple ilişki zaten kurulamaz; "zaten müşteriniz" demek yanıltıcı olurdu.
    const l = lookup({ kind: ORG_KIND.manufacturer, relationshipStatus: 'active' });
    expect(verdictFor(l, mfr, MY_VKN, OTHER)).toBe('kind-mismatch');
  });
});

describe('needsCredentials', () => {
  test('yeni kayıtta giriş bilgisi istenir', () => {
    expect(needsCredentials('new', lookup({ found: false }))).toBe(true);
  });

  test('girişi OLMAYAN misafirde istenir', () => {
    expect(needsCredentials('existing-guest', lookup({ hasLogin: false }))).toBe(true);
  });

  test('girişi OLAN misafirde istenmez', () => {
    // Aksi halde kullanıcı "yeni şifre belirledim" sanır, oysa hesap değişmez.
    expect(needsCredentials('existing-guest', lookup({ hasLogin: true }))).toBe(false);
  });

  test('abonede hiç istenmez', () => {
    expect(needsCredentials('existing-subscriber', lookup({ isSubscriber: true }))).toBe(false);
  });

  test('hatalı durumlarda istenmez', () => {
    for (const v of ['self', 'kind-mismatch', 'already-linked', 'pending', 'unknown'] as const) {
      expect(needsCredentials(v, lookup())).toBe(false);
    }
  });
});

describe('canSubmit', () => {
  test('yalnız üç durumda gönderilebilir', () => {
    expect(canSubmit('new')).toBe(true);
    expect(canSubmit('existing-guest')).toBe(true);
    expect(canSubmit('existing-subscriber')).toBe(true);
  });

  test('hatalı ve belirsiz durumlarda gönderilemez', () => {
    for (const v of ['unknown', 'self', 'kind-mismatch', 'already-linked', 'pending'] as const) {
      expect(canSubmit(v)).toBe(false);
    }
  });
});

describe('submitLabel', () => {
  test('düğme ne olacağını söyler', () => {
    expect(submitLabel('new')).toBe('Müşteriyi ekle');
    expect(submitLabel('existing-guest')).toBe('Mevcut kayda bağla');
    expect(submitLabel('existing-subscriber')).toBe('Bağlantı isteği gönder');
  });
});

describe('verdictMessage / verdictTone', () => {
  test('her karar için bir mesaj var', () => {
    for (const v of [
      'new',
      'existing-guest',
      'existing-subscriber',
      'already-linked',
      'pending',
      'kind-mismatch',
      'self',
    ] as const) {
      expect(verdictMessage(v, lookup(), ORG_KIND.manufacturer).length).toBeGreaterThan(0);
    }
    expect(verdictMessage('unknown', null, ORG_KIND.manufacturer)).toBe('');
  });

  test('mesajda firma adı geçer', () => {
    expect(verdictMessage('existing-guest', lookup(), ORG_KIND.manufacturer)).toContain(
      'Ege Mobilya',
    );
  });

  test('tonlar ayrışır', () => {
    expect(verdictTone('new')).toBe('info');
    expect(verdictTone('existing-guest')).toBe('warn');
    expect(verdictTone('kind-mismatch')).toBe('error');
    expect(verdictTone('unknown')).toBe('none');
  });
});
