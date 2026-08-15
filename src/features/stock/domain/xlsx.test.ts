/**
 * Gerçek bir Excel dosyasıyla ayrıştırma testi.
 *
 * Kullanıcının gönderdiği `Book 14.xlsx` ile aynı yapıda bir dosya burada
 * ÜRETİLİP geri okunur: yazma ve okuma birbirini doğrular. Sabit bir ikili
 * dosyayı depoya koymak yerine bu yol seçildi — şablon değişirse test de
 * kendiliğinden yeni şablonu sınar.
 */
import { describe, expect, test } from 'vitest';
import { looksLikeXlsx, parseXlsx, toXlsxBlob } from './xlsx';
import type { StockCsvRow } from './csv';

const rows: StockCsvRow[] = [
  {
    productId: '487609ce-0916-43ec-9f73-63f59463ebc0',
    productName: 'Pierro Konsol',
    productCode: 'Pierro',
    category: 'Konsol',
    groupName: 'YEMEK ODASI GRUBU',
    quantity: 20,
  },
  {
    productId: '',
    productName: 'limon Sehpa',
    productCode: 'limon',
    category: 'Sehpa',
    groupName: null,
    quantity: 7,
  },
];

/**
 * jsdom'un Blob'unda `arrayBuffer()` yok ve `Response` de onu doğru okuyamıyor
 * (2906 baytlık dosyadan 13 bayt dönüyor). Tarayıcıda ikisi de çalışır; test
 * ortamı eksiğini `FileReader` kapatır. Ürün kodu bundan etkilenmez.
 */
function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Blob okunamadı'));
    reader.readAsArrayBuffer(blob);
  });
}

async function roundTrip(input: StockCsvRow[]) {
  const blob = await toXlsxBlob(input);
  return parseXlsx(await blobToArrayBuffer(blob));
}

describe('looksLikeXlsx', () => {
  test('ZIP imzasını tanır', () => {
    expect(looksLikeXlsx(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe(true);
  });

  test('CSV metnini xlsx sanmaz', () => {
    // "Ürün" ile başlayan bir CSV'nin ilk baytları
    expect(looksLikeXlsx(new Uint8Array([0xc3, 0x9c]))).toBe(false);
  });

  test('boş dosya xlsx değildir', () => {
    expect(looksLikeXlsx(new Uint8Array([]))).toBe(false);
  });
});

describe('xlsx gidiş-dönüş', () => {
  test('ürettiğimiz dosyayı geri okur', async () => {
    const parsed = await roundTrip(rows);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(2);
  });

  test('başlık satırı veri sayılmaz', async () => {
    const parsed = await roundTrip(rows);
    expect(parsed.rows.map((r) => r.productName)).toEqual(['Pierro Konsol', 'limon Sehpa']);
  });

  test('ürün kimliği METİN olarak korunur — bilimsel gösterime düşmez', async () => {
    // Excel uzun onaltılık dizeleri sayıya çevirebiliyor; kimlik bozulursa
    // satır sessizce atlanır ve kullanıcı stoğunun neden güncellenmediğini
    // anlayamaz.
    const parsed = await roundTrip(rows);
    expect(parsed.rows[0]?.productId).toBe('487609ce-0916-43ec-9f73-63f59463ebc0');
  });

  test('kimliksiz satır YENİ ürün olarak okunur', async () => {
    const parsed = await roundTrip(rows);
    expect(parsed.rows[1]?.productId).toBe('');
    expect(parsed.rows[1]?.quantity).toBe(7);
  });

  test('Türkçe karakterler bozulmaz', async () => {
    const parsed = await roundTrip([
      { ...rows[0]!, productName: 'Şifonyer Ünitesi', category: 'Yatak Odası' },
    ]);
    expect(parsed.rows[0]?.productName).toBe('Şifonyer Ünitesi');
    expect(parsed.rows[0]?.category).toBe('Yatak Odası');
  });

  test('boş kategori ve grup null döner', async () => {
    const parsed = await roundTrip([{ ...rows[0]!, category: null, groupName: null }]);
    expect(parsed.rows[0]?.category).toBeNull();
    expect(parsed.rows[0]?.groupName).toBeNull();
  });
});
