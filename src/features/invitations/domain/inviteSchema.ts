/**
 * Davet formlarının doğrulaması — SAF (A20).
 * Sunucu (`create_invitation` RPC ve `accept-invitation` Edge Function) aynı
 * kuralları yeniden uygular; bu katman yalnız anında geri bildirim verir.
 */
import { z } from 'zod';
import { PASSWORD_MIN_LENGTH, PASSWORD_REGEX } from '@/constants';
import { isValidVknTc, normalizeVknTc } from '@/lib/tckn';

const optionalText = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' ? undefined : v))
  .refine((v) => v === undefined || z.string().email().safeParse(v).success, 'Geçersiz e-posta');

/**
 * Davet oluşturma.
 *
 * Hiçbir alan zorunlu değil: en yalın davet "bir link üret, karşı taraf
 * doldursun"dur. VKN verilirse davet o numaraya kilitlenir.
 */
export const createInviteSchema = z.object({
  companyName: optionalText,
  authorizedName: optionalText,
  phone: optionalText,
  email: optionalEmail,
  vknTc: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === undefined || v === '' ? undefined : normalizeVknTc(v)))
    .refine(
      (v) => v === undefined || isValidVknTc(v),
      'Geçerli bir VKN veya T.C. Kimlik No girin',
    ),
  discountRate: z.coerce.number().min(0, 'En az 0').max(100, 'En fazla 100').default(0),
  validDays: z.coerce.number().int().min(1, 'En az 1 gün').max(90, 'En fazla 90 gün').default(14),
});

export type CreateInviteForm = z.input<typeof createInviteSchema>;

/**
 * Daveti kabul eden tarafın kayıt formu.
 *
 * Şifreyi davet edilen KENDİ belirler — geçici şifre üretip elden iletme
 * adımı böylece ortadan kalkar (bkz. `add_counterparty` akışı).
 */
export const acceptInviteSchema = z
  .object({
    vknTc: z
      .string()
      .trim()
      .transform(normalizeVknTc)
      .refine(isValidVknTc, 'Geçerli bir VKN veya T.C. Kimlik No girin'),
    companyName: z.string().trim().min(2, 'Firma adı en az 2 karakter'),
    authorizedName: optionalText,
    phone: optionalText,
    email: optionalEmail,
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

export type AcceptInviteForm = z.input<typeof acceptInviteSchema>;

/** Davet edilen kendi VKN'si yerine daveti gönderenin numarasını yazamaz. */
export function conflictsWithInviter(vknTc: string, inviterVkn: string | null): boolean {
  if (!inviterVkn) return false;
  return normalizeVknTc(vknTc) === normalizeVknTc(inviterVkn);
}
