import { describe, expect, test } from 'vitest';
import {
  ORDER_STATUS_META,
  canCancel,
  isClosed,
  nextAction,
  type OrderStatus,
} from './status';

describe('isClosed', () => {
  test('kapalı durumlar', () => {
    for (const s of ['cancelled', 'returned', 'delivered'] as OrderStatus[]) {
      expect(isClosed(s)).toBe(true);
    }
  });

  test('açık durumlar', () => {
    for (const s of ['pending', 'confirmed', 'in_production', 'shipped'] as OrderStatus[]) {
      expect(isClosed(s)).toBe(false);
    }
  });
});

describe('nextAction — yetki ayrımı', () => {
  test('üretim zinciri üreticinindir', () => {
    expect(nextAction('pending', 'manufacturer')?.to).toBe('confirmed');
    expect(nextAction('confirmed', 'manufacturer')?.to).toBe('in_production');
    expect(nextAction('in_production', 'manufacturer')?.to).toBe('shipped');
  });

  test('perakendeci üretim zincirini ilerletemez', () => {
    expect(nextAction('pending', 'retailer')).toBeNull();
    expect(nextAction('confirmed', 'retailer')).toBeNull();
    expect(nextAction('in_production', 'retailer')).toBeNull();
  });

  test('teslim onayı perakendecinindir', () => {
    expect(nextAction('shipped', 'retailer')?.to).toBe('delivered');
    expect(nextAction('partially_shipped', 'retailer')?.to).toBe('delivered');
  });

  test('üretici teslim onayı veremez', () => {
    expect(nextAction('shipped', 'manufacturer')).toBeNull();
  });

  test('kapalı siparişte hiçbir taraf ilerletemez', () => {
    for (const kind of ['manufacturer', 'retailer'] as const) {
      for (const s of ['cancelled', 'returned', 'delivered'] as OrderStatus[]) {
        expect(nextAction(s, kind)).toBeNull();
      }
    }
  });
});

describe('canCancel', () => {
  test('sevkiyattan önce iptal edilebilir', () => {
    expect(canCancel('pending')).toBe(true);
    expect(canCancel('confirmed')).toBe(true);
    expect(canCancel('in_production')).toBe(true);
  });

  test('sevk edilmiş sipariş iptal edilemez', () => {
    // Mal yola çıktıysa iptal değil, iade süreci işler.
    expect(canCancel('shipped')).toBe(false);
    expect(canCancel('partially_shipped')).toBe(false);
  });

  test('kapalı sipariş iptal edilemez', () => {
    expect(canCancel('delivered')).toBe(false);
    expect(canCancel('cancelled')).toBe(false);
  });
});

describe('ORDER_STATUS_META', () => {
  test('her durumun Türkçe etiketi ve rengi var', () => {
    const all: OrderStatus[] = [
      'pending', 'confirmed', 'in_production', 'partially_shipped',
      'shipped', 'delivered', 'cancelled', 'return_requested', 'returned',
    ];
    for (const s of all) {
      expect(ORDER_STATUS_META[s].label.length).toBeGreaterThan(0);
      expect(ORDER_STATUS_META[s].className).toMatch(/bg-/);
    }
  });
});
