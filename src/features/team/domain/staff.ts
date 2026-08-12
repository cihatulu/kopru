/** Ekip yönetiminin saf mantığı (A20). */
import { z } from 'zod';
import { PASSWORD_MIN_LENGTH, PASSWORD_REGEX } from '@/constants';

export type StaffRole = 'owner' | 'staff' | 'accountant';

export interface StaffMember {
  id: string;
  userCode: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
  /** Kaç müşteriye atanmış — kapsam boşsa personel hiçbirini görmez. */
  scopeCount: number;
}

export const ROLE_LABEL: Record<StaffRole, string> = {
  owner: 'Sahip',
  staff: 'Personel',
  accountant: 'Muhasebeci',
};

export const ROLE_DESCRIPTION: Record<StaffRole, string> = {
  owner: 'Tüm yetkiler; ekip ve müşteri yönetimi dahil.',
  staff: 'Günlük işlemler. Yalnız kendisine atanan müşterileri görür.',
  accountant: 'Cari hesap işlemleri — revize, masraf, ödeme.',
};

/** Sahibin rolü ve durumu arayüzden değiştirilemez; sunucu da reddeder. */
export function isEditable(member: StaffMember, myUserId: string): boolean {
  return member.role !== 'owner' && member.id !== myUserId;
}

/**
 * Kapsam uyarısı.
 *
 * Kapsamı boş bir personel HİÇBİR müşteriyi göremez — bu bilinçli bir karar
 * (yeni personelin kazara herkese erişmesi, hiç erişememesinden kötüdür) ama
 * sahibin bunu bilmesi gerekir, yoksa "personel giriyor ama ekran boş"
 * şikâyeti gelir.
 */
export function needsScopeWarning(member: StaffMember): boolean {
  return member.role === 'staff' && member.isActive && member.scopeCount === 0;
}

export const createStaffSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Ad soyad en az 2 karakter'),
    role: z.enum(['staff', 'accountant']),
    email: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === '' ? undefined : v))
      .refine(
        (v) => v === undefined || z.string().email().safeParse(v).success,
        'Geçersiz e-posta',
      ),
    phone: z
      .string()
      .trim()
      .max(30)
      .optional()
      .transform((v) => (v === '' ? undefined : v)),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı`)
      .regex(PASSWORD_REGEX, 'Şifre en az bir harf ve bir rakam içermeli'),
    passwordRepeat: z.string(),
  })
  .refine((v) => v.password === v.passwordRepeat, {
    message: 'Şifreler eşleşmiyor',
    path: ['passwordRepeat'],
  });

export type CreateStaffForm = z.input<typeof createStaffSchema>;

export interface StaffFormValues {
  fullName: string;
  userCode: string;
  password: string;
  passwordConfirm: string;
}

/**
 * Personel formunun doğrulaması — ilk hatayı döndürür, hata yoksa null.
 *
 * Şifre kuralı `PASSWORD_MIN_LENGTH`/`PASSWORD_REGEX` sabitlerinden gelir.
 * Diyalog eskiden kendi 6 karakterlik kuralını yazıyordu; personel hesabı
 * platformun geri kalanından ZAYIF bir şifreyle açılabiliyordu.
 */
export function validateStaffForm(v: StaffFormValues, isEdit: boolean): string | null {
  if (!v.fullName.trim()) return 'Ad Soyad alanı zorunludur.';

  if (isEdit) {
    const code = v.userCode.trim();
    if (!code) return 'Kullanıcı Kodu alanı zorunludur.';
    if (code.length < 3 || code.length > 20) {
      return 'Kullanıcı kodu en az 3 ve en fazla 20 karakter olmalıdır.';
    }
    if (/^\d+$/.test(code)) {
      return 'Kullanıcı kodu sadece rakamlardan oluşamaz, en az bir harf içermelidir.';
    }
    if (/[^a-z0-9]/.test(code)) {
      return 'Kullanıcı kodu sadece İngilizce küçük harf ve rakam içerebilir.';
    }
    return null;
  }

  if (!v.password || v.password !== v.passwordConfirm) {
    return 'Şifreler uyuşmuyor veya boş bırakılamaz.';
  }
  if (v.password.length < PASSWORD_MIN_LENGTH || !PASSWORD_REGEX.test(v.password)) {
    return `Şifre en az ${PASSWORD_MIN_LENGTH} karakter, en az bir harf ve bir rakam içermelidir.`;
  }
  return null;
}

export const STAFF_ERROR_MESSAGES: Record<string, string> = {
  WEAK_PASSWORD: 'Şifre en az 8 karakter olmalı ve bir harf ile bir rakam içermeli.',
  INVALID_NAME: 'Ad soyad en az 2 karakter olmalı.',
  CODE_LIMIT_REACHED: 'Bu organizasyonda 99 kullanıcı sınırına ulaşıldı.',
  FORBIDDEN: 'Bu işlem için organizasyon sahibi olmanız gerekir.',
  DEFAULT: 'Personel eklenemedi. Tekrar deneyin.',
};
