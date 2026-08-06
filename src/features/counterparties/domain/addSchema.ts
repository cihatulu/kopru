/**
 * Karşı taraf ekleme formu doğrulaması — SAF (A20).
 * Sunucu (`add_counterparty`) aynı kuralları yeniden uygular; bu katman yalnız
 * kullanıcıya anında geri bildirim verir.
 */
import { z } from 'zod';
import { isValidVknTc, normalizeVknTc } from '@/lib/tckn';

const optionalText = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v === '' ? undefined : v));

export const addCounterpartySchema = z.object({
  vknTc: z
    .string()
    .trim()
    .transform(normalizeVknTc)
    .refine(isValidVknTc, 'Geçerli bir VKN veya T.C. Kimlik No girin'),
  companyName: optionalText,
  authorizedName: optionalText,
  phone: optionalText,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v))
    .refine((v) => v === undefined || z.string().email().safeParse(v).success, 'Geçersiz e-posta'),
  discountRate: z.coerce.number().min(0, 'En az 0').max(100, 'En fazla 100').default(0),
});

export type AddCounterpartyForm = z.input<typeof addCounterpartySchema>;

/** Kendi VKN'sini eklemeye çalışma — sunucu da reddeder, erken yakalıyoruz. */
export function isSelfReference(vknTc: string, myVknTc: string): boolean {
  return normalizeVknTc(vknTc) === normalizeVknTc(myVknTc);
}
