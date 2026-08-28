import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Üretici ve Perakendeci Stok İzolasyonu (Katı Güvenlik Yasası)', () => {
  it('useStockList sorgusunda owner_org_id filtresi zorunludur', () => {
    const filePath = resolve(__dirname, '../features/stock/api/useStockList.ts');
    const content = readFileSync(filePath, 'utf-8');

    // Sorguda .eq('owner_org_id', orgId) filtresi mutlaka bulunmalıdır.
    expect(content).toContain(".eq('owner_org_id', orgId)");
    // orgId boş ise sorgu boş dizi dönmelidir.
    expect(content).toContain('if (!orgId) return [];');
  });

  it('StockPage bileşeni orgId parametresini useStockList ve useProductGroups kancalarına geçer', () => {
    const filePath = resolve(__dirname, '../pages/manufacturer/StockPage.tsx');
    const content = readFileSync(filePath, 'utf-8');

    expect(content).toContain('useStockList(search, orgId)');
    expect(content).toContain('useProductGroups(orgId)');
  });

  it('useRetailerStockList sorgusunda relationships retailer_org_id filtresi zorunludur', () => {
    const filePath = resolve(__dirname, '../features/stock/api/useRetailerStockList.ts');
    const content = readFileSync(filePath, 'utf-8');

    expect(content).toContain(".eq('retailer_org_id', orgId)");
    expect(content).toContain('if (!orgId) return [];');
  });
});
