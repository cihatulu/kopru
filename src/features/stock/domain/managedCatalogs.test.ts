import { describe, expect, test } from 'vitest';
import { managedManufacturerIds, type CatalogEdge } from './managedCatalogs';

const edge = (over: Partial<CatalogEdge> = {}): CatalogEdge => ({
  manufacturerOrgId: 'm1',
  canEditCatalog: true,
  manufacturerIsSubscriber: false,
  ...over,
});

describe('managedManufacturerIds', () => {
  test('misafir üretici + anahtar açık = yönetilir', () => {
    expect([...managedManufacturerIds([edge()])]).toEqual(['m1']);
  });

  test('ÜYE üretici anahtar açık olsa da yönetilmez', () => {
    // Yaşanan hata: bu koşul unutulunca üye üreticinin PASİF ürünleri
    // perakendecinin stok listesinde göründü.
    expect(managedManufacturerIds([edge({ manufacturerIsSubscriber: true })]).size).toBe(0);
  });

  test('anahtar kapalıysa misafir üretici de yönetilmez', () => {
    expect(managedManufacturerIds([edge({ canEditCatalog: false })]).size).toBe(0);
  });

  test('aynı üretici birden çok satırda gelse tek kimlik döner', () => {
    expect(managedManufacturerIds([edge(), edge()]).size).toBe(1);
  });
});
