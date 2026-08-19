import { describe, expect, test } from 'vitest';
import { managedManufacturerIds, type CatalogEdge } from './managedCatalogs';

const edge = (over: Partial<CatalogEdge> = {}): CatalogEdge => ({
  manufacturerOrgId: 'm1',
  canEditCatalog: false, // Default is false (retailer manages it)
  manufacturerIsSubscriber: false,
  ...over,
});

describe('managedManufacturerIds', () => {
  test('misafir üretici + anahtar kapalı = yönetilir', () => {
    expect([...managedManufacturerIds([edge({ canEditCatalog: false })])]).toEqual(['m1']);
  });

  test('ÜYE üretici anahtar kapalı olsa da yönetilmez', () => {
    // Yaşanan hata: bu koşul unutulunca üye üreticinin PASİF ürünleri
    // perakendecinin stok listesinde göründü.
    expect(managedManufacturerIds([edge({ manufacturerIsSubscriber: true, canEditCatalog: false })]).size).toBe(0);
  });

  test('anahtar açık ise misafir üretici yönetilmez', () => {
    expect(managedManufacturerIds([edge({ canEditCatalog: true })]).size).toBe(0);
  });

  test('aynı üretici birden çok satırda gelse tek kimlik döner', () => {
    expect(managedManufacturerIds([edge(), edge()]).size).toBe(1);
  });
});
