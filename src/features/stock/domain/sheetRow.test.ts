/**
 * CSV ve XLSX ayrıştırıcılarının ORTAK satır kuralı.
 *
 * Buradaki senaryoların çoğu gerçek bir kullanıcı dosyasından çıktı: Excel
 * şablonu açıp kaydettiğinde başlığı 11 hücreye böldü, Türkçe karakterleri
 * bozdu ve ürün kimliklerinin son karakterini seri doldurmayla değiştirdi.
 */
import { describe, expect, test } from 'vitest';
import { isHeaderRow, toStockRow } from './sheetRow';

describe('isHeaderRow', () => {
  test('şablonun kendi başlığını tanır', () => {
    expect(isHeaderRow(['Ürün ID (DEĞİŞTİRMEYİN)', 'Ürün Adı', 'Model', '', '', 'Mevcut Stok'])).toBe(
      true,
    );
  });

  test('Excel kodlamayı bozsa da başlık sayılır', () => {
    // Gerçek dosyada ilk hücre BOM + '?r?n' idi ve içinde "id" geçmiyordu.
    expect(isHeaderRow(['﻿?r?n', 'ID', '(DE????TRMEY?N)', '?r?n', 'Ad?', 'Model'])).toBe(true);
  });

  test('uuid ile başlayan satır VERİ sayılır, başlık değil', () => {
    expect(isHeaderRow(['487609ce-0916-43ec-9f73-63f59463ebc0', 'Konsol', '', '', '', '20'])).toBe(
      false,
    );
  });

  test('bozuk stoklu gerçek veri satırı gizlenmez', () => {
    // Kimlik uuid olduğu için başlık sayılmaz; kullanıcı hatayı görmeli.
    expect(isHeaderRow(['487609ce-0916-43ec-9f73-63f59463ebc0', 'Konsol', '', '', '', 'abc'])).toBe(
      false,
    );
  });

  test('boş satır başlık değildir', () => {
    expect(isHeaderRow([])).toBe(false);
  });
});

describe('toStockRow', () => {
  const line = 2;

  test('tam satırı okur', () => {
    const r = toStockRow(['id-1', 'Masa', 'M1', 'Mutfak', 'Grup A', '12'], line);
    expect(r.ok && r.row).toMatchObject({
      productId: 'id-1',
      productName: 'Masa',
      productCode: 'M1',
      category: 'Mutfak',
      groupName: 'Grup A',
      quantity: 12,
    });
  });

  test('kimliksiz ama adı olan satır YENİ üründür', () => {
    const r = toStockRow(['', 'Yeni Sehpa', '', '', '', '3'], line);
    expect(r.ok && r.row.productId).toBe('');
    expect(r.ok && r.row.productName).toBe('Yeni Sehpa');
  });

  test('kimliği de adı da boşsa hata', () => {
    const r = toStockRow(['', '', 'M1', '', '', '3'], line);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.reason).toContain('kimliği ve adı boş');
  });

  test('negatif stok reddedilir', () => {
    const r = toStockRow(['id-1', 'Masa', '', '', '', '-2'], line);
    expect(r.ok).toBe(false);
  });

  test('boş kategori ve grup null olur', () => {
    const r = toStockRow(['id-1', 'Masa', 'M1', '  ', '', '5'], line);
    expect(r.ok && r.row.category).toBeNull();
    expect(r.ok && r.row.groupName).toBeNull();
  });

  test('fazladan sütun eklenmişse stok yine SON sütundan okunur', () => {
    const r = toStockRow(['id-1', 'Masa', 'M1', 'Mutfak', 'Grup A', '9'], line);
    expect(r.ok && r.row.quantity).toBe(9);
  });

  test('hata satır numarası dosyadaki numaradır', () => {
    const r = toStockRow(['id-1', 'Masa', '', '', '', 'abc'], 7);
    expect(!r.ok && r.error.line).toBe(7);
  });
});
