import { describe, expect, test } from 'vitest';
import { CSV_HEADERS, parseCsv, parseQuantity, toCsv } from './csv';

const BOM = '\uFEFF';

const row = {
  productId: '11111111-1111-1111-1111-111111111111',
  productName: 'Gardırop',
  productCode: 'GRD-01',
  category: null,
  groupName: null,
  quantity: 12,
};

describe('toCsv', () => {
  test('BOM ile başlar', () => {
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
    expect(parseQuantity('1.234,5')).toBe(1234.5);
  });

  test('İngilizce binlik + ondalık', () => {
    expect(parseQuantity('1,234.5')).toBe(1234.5);
  });

  test('yalnız binlik ayıracı olan Türkçe sayı', () => {
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
    const csv = `${BOM}Ürün ID (DEĞİŞTİRMEYİN);Ürün Adı;Model;Kategori;Grup Adı;Mevcut Stok\r\nabc;Masa;K1;;;5`;
    const parsed = parseCsv(csv);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]?.productId).toBe('abc');
  });

  test('virgül ayraçlı dosya da okunur', () => {
    const parsed = parseCsv('Ürün ID (DEĞİŞTİRMEYİN),Ürün Adı,Model,Kategori,Grup Adı,Mevcut Stok\nabc,Masa,K1,,,5');
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]?.quantity).toBe(5);
  });

  test('sekme ayraçlı dosya da okunur', () => {
    const parsed = parseCsv('Ürün ID (DEĞİŞTİRMEYİN)\tÜrün Adı\tModel\tKategori\tGrup Adı\tMevcut Stok\nabc\tMasa\tK1\t\t\t5');
    expect(parsed.rows).toHaveLength(1);
  });

  test('başlıksız dosya da işlenir', () => {
    const parsed = parseCsv('abc;Masa;K1;;;5');
    expect(parsed.rows).toHaveLength(1);
  });

  test('boş satırlar atlanır', () => {
    const parsed = parseCsv('Ürün ID (DEĞİŞTİRMEYİN);a;b;c;d;Mevcut Stok\n\nabc;Masa;K1;;;5\n\n');
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.errors).toEqual([]);
  });

  test('bozuk satır SESSİZCE yutulmaz', () => {
    const parsed = parseCsv('Ürün ID (DEĞİŞTİRMEYİN);a;b;c;d;Mevcut Stok\nabc;Masa;K1;;;5\nxyz;Sandalye;K2;;;abc');
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0]?.reason).toContain('sayı değil');
  });

  test('hata satır numarası DOSYADAKİ numaradır', () => {
    const parsed = parseCsv('Ürün ID (DEĞİŞTİRMEYİN);a;b;c;d;Mevcut Stok\nabc;Masa;K1;;;5\nxyz;Sandalye;K2;;;yok');
    expect(parsed.errors[0]?.line).toBe(3);
  });

  test('kimliği BOŞ ama adı olan satır YENİ ÜRÜNDÜR — hata değil', () => {
    // Sunucu bunu pasif ürün olarak açar; eskiden sessizce atlanıyordu.
    const parsed = parseCsv('Ürün ID (DEĞİŞTİRMEYİN);a;b;c;d;Mevcut Stok\n;Masa;K1;Mutfak;;5');
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]?.productId).toBe('');
    expect(parsed.rows[0]?.productName).toBe('Masa');
    expect(parsed.rows[0]?.category).toBe('Mutfak');
    expect(parsed.rows[0]?.quantity).toBe(5);
  });

  test('kimliği de adı da boş satır hata verir', () => {
    // Böyle bir satırdan ne güncellenecek ürün ne de açılacak ürün anlaşılır.
    const parsed = parseCsv('Ürün ID (DEĞİŞTİRMEYİN);a;b;c;d;Mevcut Stok\n;;K1;;;5');
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.errors[0]?.reason).toContain('kimliği ve adı boş');
  });

  test('yeni ürün satırında da negatif stok reddedilir', () => {
    const parsed = parseCsv('Ürün ID (DEĞİŞTİRMEYİN);a;b;c;d;Mevcut Stok\n;Masa;K1;;;-3');
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.errors).toHaveLength(1);
  });

  test('yalnız boşluktan ibaret ad, ad sayılmaz', () => {
    const parsed = parseCsv('Ürün ID (DEĞİŞTİRMEYİN);a;b;c;d;Mevcut Stok\n;   ;K1;;;5');
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.errors).toHaveLength(1);
  });

  test('tırnaklı ve ayraç içeren ad doğru çözülür', () => {
    const parsed = parseCsv('Ürün ID (DEĞİŞTİRMEYİN);Ürün Adı;Model;Kategori;Grup Adı;Mevcut Stok\nabc;"Koltuk; 3+2";K1;;;5');
    expect(parsed.rows[0]?.productName).toBe('Koltuk; 3+2');
    expect(parsed.rows[0]?.quantity).toBe(5);
  });

  test('CRLF ve LF birlikte gelse de bölünür', () => {
    const parsed = parseCsv('Ürün ID (DEĞİŞTİRMEYİN);a;b;c;d;Mevcut Stok\r\nabc;Masa;K1;;;5\nxyz;Sandalye;K2;;;7');
    expect(parsed.rows).toHaveLength(2);
  });

  test('tamamen boş dosya sessizce boş sonuç döner', () => {
    expect(parseCsv('')).toEqual({ rows: [], errors: [] });
  });
});
