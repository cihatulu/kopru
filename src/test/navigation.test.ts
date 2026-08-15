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
  const routeText = (panel: 'm' | 'r', path: string) => {
    const text = sections[panel];
    const start = text.indexOf(`path: '${path}'`);
    if (start === -1) throw new Error(`/${panel}/${path} rotası yok`);
    const next = text.indexOf('path:', start + 8);
    return text.slice(start, next === -1 ? undefined : next);
  };

  const guarded = (panel: 'm' | 'r', path: string) =>
    /RequireSubscriber|subscriber: true/.test(routeText(panel, path));

  const roleLock = (panel: 'm' | 'r', path: string): string | null => {
    const t = routeText(panel, path);
    if (t.includes('OWNER_ONLY')) return 'owner';
    if (t.includes('MONEY_ROLES')) return 'money';
    return null;
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

  test('personelden gizlenen bölümler ROL kilidiyle de kapalı', () => {
    // `navFor` bunları `staff` rolünden gizliyordu ama rotalar açıktı:
    // personel adres çubuğuna yazarak cari ve finans ekranlarına girebiliyordu.
    expect(roleLock('m', 'cari'), '/m/cari rol kilidi yok').not.toBeNull();
    expect(roleLock('r', 'cari'), '/r/cari rol kilidi yok').not.toBeNull();
    expect(roleLock('r', 'finans'), '/r/finans rol kilidi yok').not.toBeNull();
    expect(roleLock('m', 'musteriler')).not.toBeNull();
    expect(roleLock('r', 'tedarikcilerim')).not.toBeNull();
  });

  test('rol kilidi MENÜDEKİ gizleme ile birebir aynı', () => {
    // Muhasebeciden yalnız Ekip ve Raporlar gizli; cari/finans onun asıl işi.
    // Liste menüden dar olursa muhasebeci gördüğü sayfadan geri atılır.
    expect(roleLock('m', 'ekip')).toBe('owner');
    expect(roleLock('r', 'ekip')).toBe('owner');
    expect(roleLock('m', 'raporlar')).toBe('owner');
    expect(roleLock('r', 'raporlar')).toBe('owner');

    expect(roleLock('m', 'cari')).toBe('money');
    expect(roleLock('r', 'cari')).toBe('money');
    expect(roleLock('r', 'finans')).toBe('money');
    expect(roleLock('m', 'musteriler')).toBe('money');
    expect(roleLock('r', 'tedarikcilerim')).toBe('money');
  });

  test('sipariş ve katalog her role açık kalır', () => {
    // Personelin işi bunlar; rol kilidi eklemek onu işinden ederdi.
    for (const path of ['katalog', 'siparisler', 'iade', 'ssh', 'duyurular']) {
      expect(roleLock('r', path), `/r/${path} gereksiz rol kilidi`).toBeNull();
    }
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
