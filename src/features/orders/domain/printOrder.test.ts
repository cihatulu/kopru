import { describe, expect, test } from 'vitest';
import { buildOrderPrintHtml, paymentMethodLabel, type PrintableOrder } from './printOrder';

const data = (over: Partial<PrintableOrder> = {}): PrintableOrder => ({
  retailerName: 'adnan mobilya',
  orderNo: '260813-0001',
  createdAt: '2026-08-13T08:24:00Z',
  salespersonLabel: 'nazmiye',
  customerName: 'Ahmet Yılmaz',
  customerPhone: '05321112233',
  customerEmail: null,
  customerProvince: 'İstanbul',
  customerDistrict: 'Bakırköy',
  customerAddress: null,
  note: null,
  items: [{ name: 'Largo Köşe Takımı', quantity: 2, unitPrice: 40000, totalPrice: 80000 }],
  total: 80000,
  paymentMethodLabel: null,
  paymentAmount: null,
  ...over,
});

describe('paymentMethodLabel', () => {
  test('bilinen yöntemler Türkçeye çevrilir', () => {
    expect(paymentMethodLabel('pos_manufacturer')).toBe('Kredi Kartı (Üretici POS)');
  });

  test('bilinmeyen yöntem olduğu gibi döner', () => {
    expect(paymentMethodLabel('kripto')).toBe('kripto');
  });
});

describe('buildOrderPrintHtml', () => {
  test('başlık, referans kodu ve ürün satırı yer alır', () => {
    const html = buildOrderPrintHtml(data());
    expect(html).toContain('adnan mobilya');
    expect(html).toContain('SIP-20260813-260813-0001');
    expect(html).toContain('Largo Köşe Takımı');
    expect(html).toContain('Satışçı:');
  });

  test('boş müşteri alanları satır üretmez', () => {
    const html = buildOrderPrintHtml(data());
    expect(html).toContain('İl / İlçe');
    expect(html).not.toContain('E-posta');
    expect(html).not.toContain('Adres<');
  });

  test('tahsilat yoksa bunu açıkça yazar', () => {
    expect(buildOrderPrintHtml(data())).toContain('henüz tahsilat alınmadı');
  });

  test('tahsilat varsa yöntem ve tutar yazılır', () => {
    const html = buildOrderPrintHtml(
      data({ paymentMethodLabel: 'Nakit', paymentAmount: 5000 }),
    );
    expect(html).toContain('Ödeme Yöntemi');
    expect(html).toContain('Tahsil Edilen Tutar');
  });

  test('kullanıcı metnindeki HTML kaçırılır', () => {
    // Kaçırılmazsa belge bozulur; müşteri adı doğrudan gömülüyor.
    const html = buildOrderPrintHtml(data({ customerName: '<script>x</script>' }));
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  test('değişiklik notu kalem altında görünür', () => {
    const html = buildOrderPrintHtml(
      data({
        items: [
          { name: 'Koltuk', customDescription: 'Kumaş değişikliği', quantity: 1, unitPrice: 100, totalPrice: 100 },
        ],
      }),
    );
    expect(html).toContain('Değişiklik: Kumaş değişikliği');
  });
});
