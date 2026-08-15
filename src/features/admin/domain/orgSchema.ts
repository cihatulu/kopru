/**
 * Admin'in organizasyon açma formu — SAF (A20).
 * DB CHECK son sözü söyler; bu katman anında geri bildirim verir.
 */
import { z } from 'zod';
import { isValidVknTc, normalizeVknTc } from '@/lib/tckn';
import type { OrgKind } from '@/constants';

const optional = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v === '' ? undefined : v));

export const createOrgSchema = z.object({
  companyName: z.string().trim().min(2, 'En az 2 karakter').max(200),
  vknTc: z
    .string()
    .trim()
    .transform(normalizeVknTc)
    .refine(isValidVknTc, 'Geçerli bir VKN veya T.C. Kimlik No girin'),
  authorizedName: optional,
  phone: optional,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v))
    .refine((v) => v === undefined || z.string().email().safeParse(v).success, 'Geçersiz e-posta'),
});

export type CreateOrgForm = z.input<typeof createOrgSchema>;

/**
 * Form değerlerini org açma girdisine çevirir — SAF.
 *
 * Boş isteğe bağlı alanlar OKUNMAZ: `exactOptionalPropertyTypes` altında
 * `undefined` atamak ile alanı hiç göndermemek aynı şey değildir.
 */
export function toCreateOrgInput(kind: OrgKind, v: CreateOrgForm) {
  return {
    kind,
    companyName: v.companyName,
    vknTc: v.vknTc,
    ...(v.authorizedName ? { authorizedName: v.authorizedName } : {}),
    ...(v.phone ? { phone: v.phone } : {}),
    ...(v.email ? { email: v.email } : {}),
  };
}
