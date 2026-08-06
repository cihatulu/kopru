import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { json } from './cors.ts';

/**
 * Çağıranın platform admini olduğunu doğrular.
 *
 * Service role client RLS'i bypass ettiği için yetki kontrolü BURADA elle
 * yapılmak zorundadır — "service role kullandım, güvendeyim" yanılgısı bu
 * projedeki en kolay güvenlik hatası olurdu.
 *
 * Başarılıysa admin kullanıcının id'sini, değilse hazır bir Response döner.
 */
export async function requirePlatformAdmin(
  req: Request,
  admin: SupabaseClient,
): Promise<{ userId: string } | Response> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return json({ error: 'UNAUTHORIZED' }, 401);

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json({ error: 'UNAUTHORIZED' }, 401);

  const { data: row } = await admin
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (!row) return json({ error: 'FORBIDDEN' }, 403);
  return { userId: data.user.id };
}

/** Geçici şifre — en az bir harf ve bir rakam (PASSWORD_REGEX ile uyumlu). */
export function generateTempPassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));

  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i]! % alphabet.length];
  for (let i = 8; i < 12; i++) out += digits[bytes[i]! % digits.length];
  return out;
}
