import { describe, expect, test } from 'vitest';
import {
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  createStaffSchema,
  isEditable,
  needsScopeWarning,
  validateStaffForm,
  type StaffFormInput,
  type StaffMember,
} from './staff';

function form(over: Partial<StaffFormInput> = {}): StaffFormInput {
  return {
    fullName: 'Ayşe Yılmaz',
    userCode: 'ayse01',
    password: 'gizli123',
    passwordConfirm: 'gizli123',
    ...over,
  };
}

describe('validateStaffForm', () => {
  test('ad soyad her iki kipte de zorunludur', () => {
    expect(validateStaffForm(form({ fullName: '  ' }), false)).toMatch(/Ad Soyad/);
    expect(validateStaffForm(form({ fullName: '' }), true)).toMatch(/Ad Soyad/);
  });

  test('geçerli form null döner', () => {
    expect(validateStaffForm(form(), false)).toBeNull();
    expect(validateStaffForm(form(), true)).toBeNull();
  });

  test('şifre platform kuralına uyar — 6 karakter YETMEZ', () => {
    // Diyalog eskiden 6 karaktere izin veriyordu; sabit 8.
    expect(validateStaffForm(form({ password: 'giz12', passwordConfirm: 'giz12' }), false))
      .toMatch(/8 karakter/);
    expect(validateStaffForm(form({ password: 'gizli1', passwordConfirm: 'gizli1' }), false))
      .toMatch(/8 karakter/);
  });

  test('rakamsız şifre reddedilir', () => {
    expect(validateStaffForm(form({ password: 'gizlisifre', passwordConfirm: 'gizlisifre' }), false))
      .toMatch(/rakam/);
  });

  test('şifreler uyuşmazsa reddedilir', () => {
    expect(validateStaffForm(form({ passwordConfirm: 'baska123' }), false)).toMatch(/uyuşmuyor/);
  });

  test('düzenlemede şifre sorulmaz, kullanıcı kodu doğrulanır', () => {
    expect(validateStaffForm(form({ password: '', passwordConfirm: '' }), true)).toBeNull();
    expect(validateStaffForm(form({ userCode: 'ab' }), true)).toMatch(/3/);
    expect(validateStaffForm(form({ userCode: '12345' }), true)).toMatch(/rakamlardan/);
    expect(validateStaffForm(form({ userCode: 'Ayse01' }), true)).toMatch(/küçük harf/);
  });
});

function member(over: Partial<StaffMember> = {}): StaffMember {
  return {
    id: 'u1',
    userCode: '1234567890-01',
    fullName: 'Ayşe Yılmaz',
    email: null,
    phone: null,
    role: 'staff',
    isActive: true,
    createdAt: '2026-08-08T00:00:00Z',
    scopeCount: 2,
    ...over,
  };
}

describe('isEditable', () => {
  test('personel düzenlenebilir', () => {
    expect(isEditable(member(), 'me')).toBe(true);
  });

  test('sahip düzenlenemez', () => {
    // Sahibin rolünü düşürmek org'u sahipsiz bırakırdı.
    expect(isEditable(member({ role: 'owner' }), 'me')).toBe(false);
  });

  test('kişi kendini düzenleyemez', () => {
    // Kendini pasifleştirmek anında kilitlenme demektir; sunucu da reddeder.
    expect(isEditable(member({ id: 'me' }), 'me')).toBe(false);
  });
});

describe('needsScopeWarning', () => {
  test('kapsamı boş aktif personel uyarı ister', () => {
    // Aksi halde "personel giriyor ama ekran boş" şikâyeti gelir.
    expect(needsScopeWarning(member({ scopeCount: 0 }))).toBe(true);
  });

  test('kapsamı olan personel uyarı istemez', () => {
    expect(needsScopeWarning(member({ scopeCount: 1 }))).toBe(false);
  });

  test('pasif personel için uyarı anlamsız', () => {
    expect(needsScopeWarning(member({ scopeCount: 0, isActive: false }))).toBe(false);
  });

  test('muhasebeci kapsam kullanmaz', () => {
    // Kapsam yalnız müşteri görünürlüğünü sınırlar; muhasebeci cari üzerinde çalışır.
    expect(needsScopeWarning(member({ role: 'accountant', scopeCount: 0 }))).toBe(false);
  });

  test('sahip için uyarı yok', () => {
    expect(needsScopeWarning(member({ role: 'owner', scopeCount: 0 }))).toBe(false);
  });
});

describe('rol etiketleri', () => {
  test('her rolün etiketi ve açıklaması var', () => {
    for (const role of ['owner', 'staff', 'accountant'] as const) {
      expect(ROLE_LABEL[role]).toBeTruthy();
      expect(ROLE_DESCRIPTION[role]).toBeTruthy();
    }
  });
});

describe('createStaffSchema', () => {
  const valid = {
    fullName: 'Ayşe Yılmaz',
    role: 'staff' as const,
    password: 'sifre123',
    passwordRepeat: 'sifre123',
  };

  test('geçerli form kabul edilir', () => {
    expect(createStaffSchema.safeParse(valid).success).toBe(true);
  });

  test('sahip rolü buradan atanamaz', () => {
    // İkinci bir sahip yaratmak yetki modelini belirsizleştirirdi.
    expect(createStaffSchema.safeParse({ ...valid, role: 'owner' }).success).toBe(false);
  });

  test('şifreler eşleşmezse reddedilir', () => {
    const r = createStaffSchema.safeParse({ ...valid, passwordRepeat: 'baska123' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['passwordRepeat']);
  });

  test('rakamsız şifre reddedilir', () => {
    expect(
      createStaffSchema.safeParse({ ...valid, password: 'sifresifre', passwordRepeat: 'sifresifre' })
        .success,
    ).toBe(false);
  });

  test('kısa ad reddedilir', () => {
    expect(createStaffSchema.safeParse({ ...valid, fullName: 'A' }).success).toBe(false);
  });

  test('boş e-posta undefined olur, geçersizi reddedilir', () => {
    const r = createStaffSchema.safeParse({ ...valid, email: '' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBeUndefined();
    expect(createStaffSchema.safeParse({ ...valid, email: 'abc' }).success).toBe(false);
  });
});
