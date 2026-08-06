import { describe, expect, test } from 'vitest';
import { SUBSCRIBER_FILTERS, toSubscriberFilter } from './filters';

describe('toSubscriberFilter', () => {
  test('"tümü" seçeneği filtre eklemez', () => {
    // Boş nesne dönmeli — `isSubscriber: undefined` gönderilirse sorgu anahtarı kirlenir.
    expect(toSubscriberFilter('all')).toEqual({});
  });

  test('abone ve misafir seçenekleri bayrağa çevrilir', () => {
    expect(toSubscriberFilter('subscriber')).toEqual({ isSubscriber: true });
    expect(toSubscriberFilter('guest')).toEqual({ isSubscriber: false });
  });

  test('her filtre seçeneği eşlenebilir', () => {
    for (const f of SUBSCRIBER_FILTERS) {
      expect(() => toSubscriberFilter(f.id)).not.toThrow();
    }
  });
});
