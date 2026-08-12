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

/**
 * Çağıranın bir organizasyonun SAHİBİ olduğunu doğrular.
 *
 * `requirePlatformAdmin` ile aynı gerekçe: service role RLS'i bypass eder, bu
 * yüzden "hangi org, hangi rol" sorusu burada elle cevaplanır. Org kimliği
 * İSTEMCİDEN ALINMAZ — token'daki kullanıcının `users` satırından okunur;
 * aksi halde bir sahip, başka bir org'a personel ekleyebilirdi.
 */
export async function requireOrgOwner(
  req: Request,
  admin: SupabaseClient,
): Promise<{ userId: string; orgId: string } | Response> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return json({ error: 'UNAUTHORIZED' }, 401);

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json({ error: 'UNAUTHORIZED' }, 401);

  const { data: row } = await admin
    .from('users')
    .select('id, org_id, org_role, is_active')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!row || !row.is_active || row.org_role !== 'owner') {
    return json({ error: 'FORBIDDEN' }, 403);
  }
  return { userId: String(row.id), orgId: String(row.org_id) };
}

export function generateTempPassword(): string {
  return '1q2w3e4r';
}
