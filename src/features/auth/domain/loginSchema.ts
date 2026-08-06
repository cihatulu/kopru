/**
 * Giriş formu doğrulama — SAF (A20: react/supabase yok).
 *
 * Sunucu (`login` Edge Function) bu kuralların hepsini yeniden uygular; buradaki
 * katman yalnızca kullanıcıya anında geri bildirim vermek içindir. İstemci
 * doğrulaması güvenlik sınırı DEĞİLDİR.
 */
import { z } from 'zod';
import { isValidVknTc, normalizeVknTc } from '@/lib/tckn';
import { PASSWORD_MIN_LENGTH } from '@/constants';
import type { LoginMode, Portal } from './portals';

const vknTc = z
  .string()
  .trim()
  .transform(normalizeVknTc)
  .refine(isValidVknTc, 'Geçerli bir VKN veya T.C. Kimlik No girin');

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı`);

/** Abone girişi: kendi VKN/TCKN + şifre. */
export const subscriberSchema = z.object({
  userCode: vknTc,
  password,
});

/**
 * Misafir girişi: sponsorun VKN'si + kendi VKN/TCKN + şifre.
 * Sponsor VKN'si bir kimlik faktörüdür — sunucuda aktif ilişki kenarına karşı doğrulanır.
 */
export const guestSchema = subscriberSchema.extend({
  sponsorVkn: vknTc,
});

/**
 * Admin girişi e-posta iledir, VKN ile değil: platform admini hiçbir organizasyona
 * bağlı değildir, dolayısıyla vergi numarası ile tanımlanmaz.
 */
export const adminSchema = z.object({
  email: z.string().trim().toLowerCase().email('Geçerli bir e-posta girin'),
  password,
});

export type SubscriberForm = z.input<typeof subscriberSchema>;
export type GuestForm = z.input<typeof guestSchema>;
export type AdminForm = z.input<typeof adminSchema>;
export type LoginForm = Partial<GuestForm & AdminForm>;

export function schemaFor(portal: Portal, mode: LoginMode) {
  if (portal === 'admin') return adminSchema;
  return mode === 'guest' ? guestSchema : subscriberSchema;
}

/** Kendi VKN'si ile sponsorunki aynı olamaz — misafir kendi kendinin sponsoru değildir. */
export function sponsorConflict(values: { userCode: string; sponsorVkn?: string }): boolean {
  if (!values.sponsorVkn) return false;
  return normalizeVknTc(values.userCode) === normalizeVknTc(values.sponsorVkn);
}
