/**
 * Menü görünürlüğü — misafir org neyi göremez.
 *
 * Bu yalnız BİRİNCİ katmandır (kilitli kural 15); ikinci katman RPC'lerdedir
 * ve `team-stock.test.ts` orayı doğrular. Menüyü gizleyip sunucuyu açık
 * bırakmak, bu projede daha önce "izin anahtarı sessizce çalışmıyordu"
 * olarak yaşandı.
 */
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
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

describe('menüden gizlenen her bölüm ROTADA da kilitli', () => {
  // `RequireSubscriber` guard'ı tanımlıydı ama router'da HİÇ kullanılmıyordu:
  // menüden gizlenen sayfalar adres çubuğundan açılabiliyordu. Menü ile rota
  // ayrışmasın diye kilit burada eşleştirilir (kilitli kural 15).
  const router = readFileSync('src/app/router.tsx', 'utf8');

  // `stok`, `ekip`, `raporlar` İKİ panelde de var; arama panel bazlı yapılır.
  const mfrStart = router.indexOf('ROUTES.manufacturer');
  const rtlStart = router.indexOf('ROUTES.retailer');
  const adminStart = router.indexOf('ROUTES.admin');
  const sections = {
    m: router.slice(mfrStart, rtlStart),
    r: router.slice(rtlStart, adminStart),
  };

  /**
   * `path: 'x'` ile BİR SONRAKİ `path:` arasındaki metne bakar.
   *
   * Sabit karakter penceresi kullanılamaz: pencere bir sonraki rotanın
   * korumasına taşıp korumasız bir rotayı korumalı gösteriyordu.
   */
  const guarded = (panel: 'm' | 'r', path: string) => {
    const text = sections[panel];
    const start = text.indexOf(`path: '${path}'`);
    if (start === -1) throw new Error(`/${panel}/${path} rotası yok`);
    const next = text.indexOf('path:', start + 8);
    return text.slice(start, next === -1 ? undefined : next).includes('RequireSubscriber');
  };

  test('misafir perakendeciden gizlenenler', () => {
    for (const path of ['finans', 'raporlar', 'tedarikcilerim', 'ekip', 'stok']) {
      expect(guarded('r', path), `/r/${path} korumasız`).toBe(true);
    }
  });

  test('misafir üreticiden gizlenenler', () => {
    for (const path of ['musteriler', 'raporlar', 'ekip']) {
      expect(guarded('m', path), `/m/${path} korumasız`).toBe(true);
    }
  });

  test('üreticinin stok rotası kilitlenmez', () => {
    // Misafir üretici, izin anahtarı açıksa stok tutabilir; karar org
    // düzeyinde değil İLİŞKİ düzeyindedir, RPC verir.
    expect(guarded('m', 'stok')).toBe(false);
  });

  test('herkese açık bölümler kilitlenmez', () => {
    // Misafir de sipariş verir, cari görür, katalog gezer.
    for (const path of ['katalog', 'siparisler', 'cari', 'iade', 'duyurular']) {
      expect(guarded('r', path), `/r/${path} gereksiz kilitli`).toBe(false);
    }
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
