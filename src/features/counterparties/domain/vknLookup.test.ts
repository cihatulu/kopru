import { describe, expect, test } from 'vitest';
import {
  canSubmit,
  credentialsMode,
  requiresPassword,
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

describe('credentialsMode', () => {
  test('pencere açılır açılmaz alanlar GÖRÜNÜR', () => {
    // 'unknown' = VKN henüz yazılmadı. Alanları gizlemek, kullanıcıya şifre
    // alanının hiç olmadığını düşündürüyordu.
    expect(credentialsMode('unknown', null)).toBe('ask');
  });

  test('yeni kayıtta sorulur', () => {
    expect(credentialsMode('new', lookup({ found: false }))).toBe('ask');
  });

  test('girişi OLMAYAN misafirde sorulur', () => {
    expect(credentialsMode('existing-guest', lookup({ hasLogin: false }))).toBe('ask');
  });

  test('girişi OLAN misafirde sorulmaz, sebebi yazılır', () => {
    expect(credentialsMode('existing-guest', lookup({ hasLogin: true }))).toBe('has-login');
  });

  test('abonede sorulmaz — kendi hesabı var', () => {
    expect(credentialsMode('existing-subscriber', lookup({ isSubscriber: true }))).toBe(
      'subscriber',
    );
  });

  test('hatalı durumlarda bölüm hiç gösterilmez', () => {
    for (const v of ['self', 'kind-mismatch', 'already-linked', 'pending'] as const) {
      expect(credentialsMode(v, lookup())).toBe('hidden');
    }
  });
});

describe('requiresPassword', () => {
  test('yalnız gerçekten hesap açılacaksa zorunlu', () => {
    expect(requiresPassword('new', lookup({ found: false }))).toBe(true);
    expect(requiresPassword('existing-guest', lookup({ hasLogin: false }))).toBe(true);
  });

  test('hesabı olan veya abone firmada zorunlu değil', () => {
    expect(requiresPassword('existing-guest', lookup({ hasLogin: true }))).toBe(false);
    expect(requiresPassword('existing-subscriber', lookup({ isSubscriber: true }))).toBe(false);
  });

  test('VKN yazılmamışken zorunlu değil — kaydetme zaten kapalı', () => {
    expect(requiresPassword('unknown', null)).toBe(false);
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
