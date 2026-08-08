import { describe, expect, test } from 'vitest';
import {
  CRITICAL_STOCK,
  MARGIN_LABEL,
  compactMoney,
  computeStats,
  marginBand,
  matchesStockFilter,
  netProfit,
  stockLevel,
} from './productStats';

describe('netProfit', () => {
  test('maliyet yoksa null', () => {
    expect(netProfit(1000, undefined)).toBeNull();
  });

  test('kâr fiyattan maliyet çıkarılarak bulunur', () => {
    expect(netProfit(20000, 10000)).toBe(10000);
  });

  test('zarar negatif döner', () => {
    expect(netProfit(1000, 1500)).toBe(-500);
  });
});

describe('marginBand', () => {
  test('%30 ve üstü yüksek', () => {
    expect(marginBand(30)).toBe('high');
    expect(marginBand(50)).toBe('high');
  });

  test('%15-30 arası orta', () => {
    expect(marginBand(15)).toBe('mid');
    expect(marginBand(29.9)).toBe('mid');
  });

  test('%15 altı düşük', () => {
    expect(marginBand(14.9)).toBe('low');
    expect(marginBand(-10)).toBe('low');
  });

  test('bilinmeyen marj ayrı bir durumdur', () => {
    expect(marginBand(null)).toBe('unknown');
  });

  test('her bandın etiketi var', () => {
    for (const band of ['high', 'mid', 'low', 'unknown'] as const) {
      expect(MARGIN_LABEL[band]).toBeTruthy();
    }
  });
});

describe('stockLevel', () => {
  test('kayıt yoksa bilinmiyor', () => {
    expect(stockLevel(null)).toBe('unknown');
  });

  test('sıfır tükendi demektir', () => {
    expect(stockLevel(0)).toBe('out');
  });

  test('kritik eşiğin altı düşük', () => {
    expect(stockLevel(CRITICAL_STOCK - 1)).toBe('low');
  });

  test('eşik dahil normal sayılır', () => {
    expect(stockLevel(CRITICAL_STOCK)).toBe('ok');
  });
});

describe('computeStats', () => {
  const items = [
    { price: 20000, quantity: 17 },
    { price: 20000, quantity: 6 },
    { price: 5000, quantity: 0 },
    { price: 1000, quantity: null },
  ];

  test('toplam ürün TÜM satırları sayar', () => {
    expect(computeStats(items).total).toBe(4);
  });

  test('stok kaydı olmayan ürün kritik SAYILMAZ', () => {
    // Aksi halde her yeni üründe yanlış alarm çalardı.
    expect(computeStats(items).criticalStock).toBe(2); // 6 adet + 0 adet
  });

  test('stok değeri fiyat × adet toplamıdır', () => {
    expect(computeStats(items).stockValue).toBe(20000 * 17 + 20000 * 6);
  });

  test('aktif satışta yalnız stoğu olanlar', () => {
    expect(computeStats(items).activeForSale).toBe(2);
  });

  test('boş liste sıfırlarla döner', () => {
    expect(computeStats([])).toEqual({
      total: 0,
      criticalStock: 0,
      stockValue: 0,
      activeForSale: 0,
    });
  });
});

describe('compactMoney', () => {
  test('binler K ile kısalır', () => {
    expect(compactMoney(460_000)).toBe('₺460K');
  });

  test('milyonlar M ile kısalır', () => {
    expect(compactMoney(1_500_000)).toBe('₺1.5M');
  });

  test('binin altı olduğu gibi', () => {
    expect(compactMoney(750)).toBe('₺750');
  });

  test('sıfır', () => {
    expect(compactMoney(0)).toBe('₺0');
  });
});

describe('matchesStockFilter', () => {
  test('filtre yoksa hepsi geçer', () => {
    expect(matchesStockFilter(null, 'all')).toBe(true);
    expect(matchesStockFilter(5, 'all')).toBe(true);
  });

  test('düşük stok filtresi', () => {
    expect(matchesStockFilter(5, 'low')).toBe(true);
    expect(matchesStockFilter(50, 'low')).toBe(false);
  });

  test('yüksek stok filtresi', () => {
    expect(matchesStockFilter(50, 'high')).toBe(true);
    expect(matchesStockFilter(5, 'high')).toBe(false);
  });

  test('stok kaydı olmayan ürün hiçbir stok filtresine girmez', () => {
    // "Düşük stoklu ürünleri göster" dendiğinde, stoğu bilinmeyen bir ürünü
    // listeye koymak kullanıcıyı yanlış bir işe yönlendirirdi.
    expect(matchesStockFilter(null, 'low')).toBe(false);
    expect(matchesStockFilter(null, 'high')).toBe(false);
  });
});
