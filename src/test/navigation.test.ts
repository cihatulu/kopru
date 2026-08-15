/**
 * Menü görünürlüğü — misafir org neyi göremez.
 *
 * Bu yalnız BİRİNCİ katmandır (kilitli kural 15); ikinci katman RPC'lerdedir
 * ve `team-stock.test.ts` orayı doğrular. Menüyü gizleyip sunucuyu açık
 * bırakmak, bu projede daha önce "izin anahtarı sessizce çalışmıyordu"
 * olarak yaşandı.
 */
import { describe, expect, test } from 'vitest';
import { navFor } from '@/app/layout/navigation';
import { ORG_KIND } from '@/constants';

const labels = (kind: 'manufacturer' | 'retailer', isSubscriber: boolean) =>
  navFor(kind, [], 'owner', isSubscriber).map((i) => i.label);

describe('misafir perakendeci menüsü', () => {
  const guest = labels(ORG_KIND.retailer, false);

  test('Stok Yönetimi GİZLİ — stok tutmak üye hakkıdır', () => {
    expect(guest).not.toContain('Stok Yönetimi');
  });

  test('abonelik gerektiren diğer bölümler de gizli', () => {
    for (const hidden of ['Finans', 'Raporlar', 'Tedarikçilerim', 'Ekip Yönetimi']) {
      expect(guest).not.toContain(hidden);
    }
  });

  test('sipariş verebilmek için gereken bölümler açık kalır', () => {
    // Misafir perakendeci tedarikçisinin stoğunu katalogdan görür ve sipariş verir.
    for (const shown of ['Ürün Kataloğu', 'Sepetim', 'Siparişlerim', 'Cari Hesabım']) {
      expect(guest).toContain(shown);
    }
  });
});

describe('üye perakendeci menüsü', () => {
  test('Stok Yönetimi görünür — kendi deposunu tutar', () => {
    expect(labels(ORG_KIND.retailer, true)).toContain('Stok Yönetimi');
  });
});

describe('üretici menüsü', () => {
  test('üye üreticide Stok Yönetimi görünür', () => {
    expect(labels(ORG_KIND.manufacturer, true)).toContain('Stok Yönetimi');
  });

  test('misafir üreticide menü kalır — izin ilişkiye bağlıdır, org tipine değil', () => {
    // `can_edit_catalog` ilişki başına açılır; org düzeyinde karar verilemez.
    // Bu yüzden gizleme yapılmaz, yazma girişimini RPC reddeder.
    expect(labels(ORG_KIND.manufacturer, false)).toContain('Stok Yönetimi');
  });
});
