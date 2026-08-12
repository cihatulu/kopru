import { describe, expect, test } from 'vitest';
import {
  sshBlockReason,
  sshTitle,
  validateSshDraft,
  type SshDraft,
  type SshItemSelection,
  type SshOrderSummary,
} from './sshDraft';

const order = (over: Partial<SshOrderSummary> = {}): SshOrderSummary => ({
  orderNo: 'SP-1001',
  openSshCount: 0,
  totalSshCount: 0,
  ...over,
});

const item = (over: Partial<SshItemSelection> = {}): SshItemSelection => ({
  id: 'i1',
  productId: 'p1',
  name: 'Koltuk',
  maxQty: 2,
  qty: 1,
  selected: true,
  ...over,
});

const draft = (over: Partial<SshDraft> = {}): SshDraft => ({
  order: order(),
  items: [item()],
  customProductName: '',
  description: 'Ayak kırık geldi.',
  ...over,
});

describe('sshBlockReason', () => {
  test('temiz siparişte engel yok', () => {
    expect(sshBlockReason(order())).toBeNull();
  });

  test('açık talep varken yeni talep açılamaz', () => {
    expect(sshBlockReason(order({ openSshCount: 1 }))).toMatch(/sonuçlanmamış/);
  });

  test('sipariş başına 2 talep sınırı', () => {
    expect(sshBlockReason(order({ totalSshCount: 1 }))).toBeNull();
    expect(sshBlockReason(order({ totalSshCount: 2 }))).toMatch(/sınırına/);
  });

  test('ikisi birden varsa açık talep mesajı öncelikli', () => {
    expect(sshBlockReason(order({ openSshCount: 1, totalSshCount: 2 }))).toMatch(/sonuçlanmamış/);
  });
});

describe('validateSshDraft', () => {
  test('geçerli taslak null döner', () => {
    expect(validateSshDraft(draft())).toBeNull();
  });

  test('siparişin kalemleri varken hiçbiri seçilmemişse reddedilir', () => {
    expect(validateSshDraft(draft({ items: [item({ selected: false })] }))).toMatch(/en az bir/);
  });

  test('siparişsiz talepte ürün adı zorunlu', () => {
    expect(validateSshDraft(draft({ order: null, items: [], customProductName: '  ' })))
      .toMatch(/ürün adı/);
    expect(validateSshDraft(draft({ order: null, items: [], customProductName: 'Yatak' })))
      .toBeNull();
  });

  test('açıklama her durumda zorunlu', () => {
    expect(validateSshDraft(draft({ description: '   ' }))).toMatch(/açıklayınız/);
  });
});

describe('sshTitle', () => {
  test('tek ürün seçiliyse adıyla', () => {
    expect(sshTitle(draft())).toBe('Koltuk SSH Talebi');
  });

  test('birden çok üründe kalanı sayıyla anlatır', () => {
    const items = [item(), item({ id: 'i2', name: 'Sehpa' }), item({ id: 'i3', name: 'Masa' })];
    expect(sshTitle(draft({ items }))).toBe('Koltuk (+2 ürün) SSH Talebi');
  });

  test('seçili kalem yoksa elle yazılan ürün adı kullanılır', () => {
    expect(sshTitle(draft({ items: [], customProductName: 'Yatak Başı' })))
      .toBe('Yatak Başı SSH Talebi');
  });

  test('hiçbiri yoksa sipariş numarasına düşer', () => {
    expect(sshTitle(draft({ items: [] }))).toBe('Sipariş #SP-1001 SSH Talebi');
  });

  test('sipariş de yoksa genel başlık', () => {
    expect(sshTitle(draft({ order: null, items: [] }))).toBe('Genel Servis / SSH Talebi');
  });
});
