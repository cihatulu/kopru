import { describe, expect, test } from 'vitest';
import { addCounterpartySchema, isSelfReference } from './addSchema';

const VKN = '1234567890';

describe('addCounterpartySchema', () => {
  test('yalnız geçerli format ile kabul edilir', () => {
    expect(addCounterpartySchema.safeParse({ vknTc: VKN }).success).toBe(true);
    expect(addCounterpartySchema.safeParse({ vknTc: '111111111' }).success).toBe(false); // 9 hane
  });

  test('VKN normalize edilir', () => {
    const r = addCounterpartySchema.safeParse({ vknTc: ' 123-456 7890 ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.vknTc).toBe(VKN);
  });

  test('boş isteğe bağlı alanlar undefined olur', () => {
    const r = addCounterpartySchema.safeParse({ vknTc: VKN, companyName: '', email: '' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.companyName).toBeUndefined();
      expect(r.data.email).toBeUndefined();
    }
  });

  test('geçersiz e-posta reddedilir', () => {
    expect(addCounterpartySchema.safeParse({ vknTc: VKN, email: 'abc' }).success).toBe(false);
  });

  test('iskonto 0-100 aralığında sınırlanır', () => {
    expect(addCounterpartySchema.safeParse({ vknTc: VKN, discountRate: 101 }).success).toBe(false);
    expect(addCounterpartySchema.safeParse({ vknTc: VKN, discountRate: -1 }).success).toBe(false);
    expect(addCounterpartySchema.safeParse({ vknTc: VKN, discountRate: 12.5 }).success).toBe(true);
  });

  test('iskonto verilmezse 0 olur', () => {
    const r = addCounterpartySchema.safeParse({ vknTc: VKN });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.discountRate).toBe(0);
  });
});

describe('isSelfReference', () => {
  test('kendi VKN sini eklemek yakalanır', () => {
    expect(isSelfReference(' 123-456-7890 ', VKN)).toBe(true);
  });

  test('farklı VKN sorun değil', () => {
    expect(isSelfReference('0123456789', VKN)).toBe(false);
  });
});
