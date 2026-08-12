import { describe, expect, test } from 'vitest';
import {
  ORDER_STATUS_META,
  canCancel,
  isClosed,
  isShipmentStep,
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

  test('kısmi sevkiyattan sonra sevkiyat devam edebilir', () => {
    // Kalan kalemler için üretici yeniden sevk eder; her seferinde çocuk sipariş oluşur.
    const a = nextAction('partially_shipped', 'manufacturer');
    expect(a?.to).toBe('shipped');
    expect(a?.label).toBe('Sevk et');
  });

  test('sevkiyat adımı ayrı bir ekran gerektirir', () => {
    // Miktar seçtirmeden doğrudan durum değiştirmek kısmi sevkiyatı imkânsız kılardı.
    expect(isShipmentStep('shipped')).toBe(true);
    expect(isShipmentStep('confirmed')).toBe(false);
    expect(isShipmentStep('delivered')).toBe(false);
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

  test('sevkiyat ve öncesindeki açık siparişler iptal edilebilir', () => {
    expect(canCancel('shipped')).toBe(true);
    expect(canCancel('partially_shipped')).toBe(true);
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
