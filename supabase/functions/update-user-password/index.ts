/**
 * KÖPRÜ — TEK YETKİLİ ŞİFRE YOLU (kilitli kural 2).
 *
 * Şifreler yalnız burada, `auth.admin.*` ile yazılır. Veritabanında
 * `password_hash` diye bir kolon YOKTUR; şifrenin tek kopyası Supabase Auth'tadır.
 *
 * İki mod:
 *   · admin_reset — platform admini bir organizasyonun owner şifresini yeniler.
 *     Yeni şifre BİR KEZ döner, hiçbir yere kaydedilmez.
 *   · self        — kullanıcı kendi şifresini değiştirir; mevcut şifresini
 *     doğrulamak ZORUNDADIR (oturum çalınmışsa şifre değiştirilememeli).
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';
import { generateTempPassword, requirePlatformAdmin } from '../_shared/auth.ts';

const MIN_LENGTH = 8;
const HAS_LETTER_AND_DIGIT = /^(?=.*[A-Za-zÇĞİÖŞÜçğıöşü])(?=.*\d).+$/;

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function anonClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Platform admini bir organizasyonun owner şifresini yeniler. */
async function adminReset(req: Request, orgId: string) {
  const auth = await requirePlatformAdmin(req, admin);
  if (auth instanceof Response) return auth;

  const { data: user } = await admin
    .from('users')
    .select('id, user_code, org_id, organizations(company_name)')
    .eq('org_id', orgId)
    .eq('org_role', 'owner')
    .maybeSingle();

  if (!user) {
    // Henüz girişi olmayan bir org. Şifre yenilemek yerine hesabın açılması gerekir.
    return json({ error: 'NO_OWNER_USER' }, 404);
  }

  const password = generateTempPassword();
  const { error } = await admin.auth.admin.updateUserById(user.id, { password });
  if (error) {
    console.error('sifre guncellenemedi', error);
    return json({ error: 'UPDATE_FAILED' }, 500);
  }

  // Kilitlenme sayacı sıfırlanır: yeni şifreyle hemen giriş yapılabilmeli.
  await admin.from('users').update({ failed_attempts: 0, locked_until: null }).eq('id', user.id);

  await admin.from('system_logs').insert({
    actor_user_id: auth.userId,
    actor_org_id: orgId,
    action: 'user.password_reset',
    entity: 'users',
    entity_id: user.id,
    meta: { by: 'platform_admin' },
  });

  // Şifre YALNIZ burada, bir kez döner.
  return json({ userCode: user.user_code, tempPassword: password });
}

/** Kullanıcı kendi şifresini değiştirir — mevcut şifresini doğrulayarak. */
async function selfChange(req: Request, currentPassword: string, newPassword: string) {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return json({ error: 'UNAUTHORIZED' }, 401);

  const { data: me, error: meError } = await admin.auth.getUser(token);
  if (meError || !me.user) return json({ error: 'UNAUTHORIZED' }, 401);

  if (newPassword.length < MIN_LENGTH || !HAS_LETTER_AND_DIGIT.test(newPassword)) {
    return json({ error: 'WEAK_PASSWORD' }, 400);
  }

  // Mevcut şifre doğrulanmadan değiştirme YAPILMAZ: çalınmış bir oturumla
  // hesabın ele geçirilmesini engelleyen tek kontrol budur.
  const { data: row } = await admin
    .from('users')
    .select('auth_email')
    .eq('id', me.user.id)
    .maybeSingle();
  if (!row) return json({ error: 'UNAUTHORIZED' }, 401);

  const anon = anonClient();
  const { error: signInError } = await anon.auth.signInWithPassword({
    email: row.auth_email as string,
    password: currentPassword,
  });
  if (signInError) return json({ error: 'WRONG_CURRENT_PASSWORD' }, 401);

  const { error } = await admin.auth.admin.updateUserById(me.user.id, {
    password: newPassword,
  });
  if (error) {
    console.error('sifre guncellenemedi', error);
    return json({ error: 'UPDATE_FAILED' }, 500);
  }

  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  let body: {
    mode?: string;
    orgId?: string;
    currentPassword?: string;
    newPassword?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'BAD_REQUEST' }, 400);
  }

  try {
    if (body.mode === 'admin_reset') {
      if (!body.orgId) return json({ error: 'BAD_REQUEST' }, 400);
      return await adminReset(req, body.orgId);
    }
    if (body.mode === 'self') {
      if (!body.currentPassword || !body.newPassword) {
        return json({ error: 'BAD_REQUEST' }, 400);
      }
      return await selfChange(req, body.currentPassword, body.newPassword);
    }
    return json({ error: 'BAD_REQUEST' }, 400);
  } catch (e) {
    console.error('update-user-password failed', e);
    return json({ error: 'INTERNAL' }, 500);
  }
});
