import { describe, expect, test } from 'vitest';
import { CSV_HEADERS, parseCsv, parseQuantity, toCsv } from './csv';

const BOM = '﻿';

const row = {
  productId: '11111111-1111-1111-1111-111111111111',
  productCode: 'GRD-01',
  productName: 'Gardırop',
  quantity: 12,
};

describe('toCsv', () => {
  test('BOM ile başlar', () => {
    // BOM olmazsa Excel UTF-8'i sistem kod sayfası sanar: "Gardırop" → "GardÄ±rop".
    expect(toCsv([row]).startsWith(BOM)).toBe(true);
  });

  test('başlık satırı beklenen sütunları taşır', () => {
    const line = toCsv([]).replace(BOM, '').split('\r\n')[0];
    expect(line).toBe(CSV_HEADERS.join(';'));
  });

  test('ondalık virgülle yazılır', () => {
    expect(toCsv([{ ...row, quantity: 2.5 }])).toContain(';2,5');
  });

  test('metin alanlar tırnaklanır — ayraç içeren ad satırı bozmaz', () => {
    const csv = toCsv([{ ...row, productName: 'Koltuk; 3+2' }]);
    expect(csv).toContain('"Koltuk; 3+2"');
  });

  test('tırnak içeren ad kaçışlanır', () => {
    const csv = toCsv([{ ...row, productName: '19" Masa' }]);
    expect(csv).toContain('"19"" Masa"');
  });
});

describe('parseQuantity', () => {
  test('düz sayı', () => {
    expect(parseQuantity('12')).toBe(12);
  });

  test('Türkçe ondalık', () => {
    expect(parseQuantity('2,5')).toBe(2.5);
  });

  test('İngilizce ondalık', () => {
    expect(parseQuantity('2.5')).toBe(2.5);
  });

  test('Türkçe binlik + ondalık', () => {
    // "1.234,5" → 1234.5. Nokta binlik ayıracıdır, atılır.
    expect(parseQuantity('1.234,5')).toBe(1234.5);
  });

  test('İngilizce binlik + ondalık', () => {
    expect(parseQuantity('1,234.5')).toBe(1234.5);
  });

  test('yalnız binlik ayıracı olan Türkçe sayı', () => {
    // "1.234" burada 1.234 (bin iki yüz otuz dört) DEĞİL, 1.234 okunur.
    // Belirsiz bir durum; kural "son ayraç ondalıktır" olduğu için 1.234 döner.
    // Testin amacı bu davranışı SABİTLEMEK — sessizce değişirse yakalanır.
    expect(parseQuantity('1.234')).toBe(1.234);
  });

  test('boş değer sayı değildir', () => {
    expect(parseQuantity('')).toBeNull();
    expect(parseQuantity('   ')).toBeNull();
  });

  test('negatif stok reddedilir', () => {
    expect(parseQuantity('-5')).toBeNull();
  });

  test('sayı olmayan reddedilir', () => {
    expect(parseQuantity('abc')).toBeNull();
    expect(parseQuantity('12 adet')).toBeNull();
  });

  test('sıfır geçerlidir', () => {
    // Stoğu sıfırlamak meşru bir işlem; "boş" ile karıştırılmamalı.
    expect(parseQuantity('0')).toBe(0);
  });
});

describe('parseCsv', () => {
  test('kendi ürettiğimiz dosyayı geri okur', () => {
    const parsed = parseCsv(toCsv([row]));
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toEqual([row]);
  });

  test('BOM başlığı bozmaz', () => {
    const csv = `${BOM}urun_id;urun_kodu;urun_adi;stok\r\nabc;K1;Masa;5`;
    const parsed = parseCsv(csv);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]?.productId).toBe('abc');
  });

  test('virgül ayraçlı dosya da okunur', () => {
    // Kullanıcı dosyayı başka bir araçla kaydetmiş olabilir.
    const parsed = parseCsv('urun_id,urun_kodu,urun_adi,stok\nabc,K1,Masa,5');
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]?.quantity).toBe(5);
  });

  test('sekme ayraçlı dosya da okunur', () => {
    const parsed = parseCsv('urun_id\turun_kodu\turun_adi\tstok\nabc\tK1\tMasa\t5');
    expect(parsed.rows).toHaveLength(1);
  });

  test('başlıksız dosya da işlenir', () => {
    const parsed = parseCsv('abc;K1;Masa;5');
    expect(parsed.rows).toHaveLength(1);
  });

  test('boş satırlar atlanır', () => {
    const parsed = parseCsv('urun_id;a;b;stok\n\nabc;K1;Masa;5\n\n');
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.errors).toEqual([]);
  });

  test('bozuk satır SESSİZCE yutulmaz', () => {
    // En tehlikeli davranış: 100 satırlık dosyanın 3'ünü atlayıp "tamam" demek.
    const parsed = parseCsv('urun_id;a;b;stok\nabc;K1;Masa;5\nxyz;K2;Sandalye;abc');
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0]?.reason).toContain('sayı değil');
  });

  test('hata satır numarası DOSYADAKİ numaradır', () => {
    // Kullanıcı Excel'de o satıra gidebilmeli; 0 tabanlı indeks işe yaramaz.
    const parsed = parseCsv('urun_id;a;b;stok\nabc;K1;Masa;5\n;K2;Sandalye;3');
    expect(parsed.errors[0]?.line).toBe(3);
  });

  test('ürün kimliği boş satır hata verir', () => {
    const parsed = parseCsv('urun_id;a;b;stok\n;K1;Masa;5');
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.errors[0]?.reason).toContain('kimliği boş');
  });

  test('tırnaklı ve ayraç içeren ad doğru çözülür', () => {
    const parsed = parseCsv('urun_id;urun_kodu;urun_adi;stok\nabc;K1;"Koltuk; 3+2";5');
    expect(parsed.rows[0]?.productName).toBe('Koltuk; 3+2');
    expect(parsed.rows[0]?.quantity).toBe(5);
  });

  test('CRLF ve LF birlikte gelse de bölünür', () => {
    const parsed = parseCsv('urun_id;a;b;stok\r\nabc;K1;Masa;5\nxyz;K2;Sandalye;7');
    expect(parsed.rows).toHaveLength(2);
  });

  test('tamamen boş dosya sessizce boş sonuç döner', () => {
    expect(parseCsv('')).toEqual({ rows: [], errors: [] });
  });
});
