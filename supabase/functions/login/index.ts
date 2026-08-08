/**
 * KÖPRÜ — TEK GİRİŞ YOLU (kilitli kural 3).
 *
 * Kullanıcı VKN/TCKN + şifre ile girer; Supabase Auth ise e-posta ister.
 * Aradaki eşleme, sponsor-VKN doğrulaması ve kilit sayacı BURADA yapılır —
 * istemcide değil.
 *
 * Neden istemcide değil:
 *   1. İstemci `users` tablosunda kod arayabilseydi, "bu VKN sistemde var mı?"
 *      diye deneyerek tüm müşteri listesi çıkarılabilirdi.
 *   2. Misafirin sponsor VKN'si bir KİMLİK FAKTÖRÜDÜR; istemcide doğrulanamaz.
 *   3. Kilit sayacı istemcide tutulsaydı kullanıcı sıfırlayabilirdi.
 *
 * Tüm başarısız yollar TEK TİP cevap döner (INVALID_CREDENTIALS) — hangi adımda
 * düşüldüğü sızdırılmaz. Tek istisna: kilitli hesap (kullanıcının bilmesi gerekir).
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 30;

type OrgPortal = 'manufacturer' | 'retailer';
type Portal = OrgPortal | 'admin';
type Mode = 'subscriber' | 'guest';

interface LoginBody {
  portal?: Portal;
  mode?: Mode;
  userCode?: string;
  sponsorVkn?: string;
  /** Yalnız admin portalında kullanılır — platform admini bir org'a bağlı değildir. */
  email?: string;
  password?: string;
}

const normalize = (v: string) => v.replace(/[\s.-]/g, '');

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

async function audit(
  userCode: string,
  portal: OrgPortal | null,
  succeeded: boolean,
  reason: string | null,
  ip: string | null,
) {
  // Başarısız giriş system_logs'a YAZILMAZ — orası org bazlı okunabilir ve
  // deneme kayıtları kullanıcı numaralandırmasına yol açardı.
  await admin.from('login_audit').insert({
    user_code: userCode,
    portal,
    succeeded,
    reason,
    ip,
  });
}

/**
 * Platform admini girişi. Admin hiçbir organizasyona bağlı değildir, dolayısıyla
 * VKN'si de yoktur — kimliği e-postadır. Şifre doğru olsa bile `platform_admins`
 * tablosunda kaydı yoksa oturum verilmez.
 */
async function loginAsAdmin(email: string, password: string, ip: string | null) {
  const anon = anonClient();
  const { data, error } = await anon.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    await audit(email, null, false, 'ADMIN_BAD_PASSWORD', ip);
    return json({ error: 'INVALID_CREDENTIALS' }, 401);
  }

  const { data: row } = await admin
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', data.user!.id)
    .maybeSingle();

  if (!row) {
    // Normal bir kullanıcı admin kapısından girmeye çalıştı. Oturumu iptal et.
    await anon.auth.signOut();
    await audit(email, null, false, 'NOT_ADMIN', ip);
    return json({ error: 'INVALID_CREDENTIALS' }, 401);
  }

  await audit(email, null, true, null, ip);
  return json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    isPlatformAdmin: true,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  let body: LoginBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'INVALID_CREDENTIALS' }, 401);
  }

  const portal = body.portal;
  const mode = body.mode;
  const userCode = normalize(body.userCode ?? '');
  const sponsorVkn = normalize(body.sponsorVkn ?? '');
  const password = body.password ?? '';

  try {
    // --- Admin ayrı kapı: org yok, kimlik e-posta ---
    if (portal === 'admin') {
      const email = (body.email ?? '').trim().toLowerCase();
      if (!email || !password) return json({ error: 'INVALID_CREDENTIALS' }, 401);
      return await loginAsAdmin(email, password, ip);
    }

    if (
      (portal !== 'manufacturer' && portal !== 'retailer') ||
      (mode !== 'subscriber' && mode !== 'guest') ||
      !userCode ||
      !password ||
      (mode === 'guest' && !sponsorVkn)
    ) {
      return json({ error: 'INVALID_CREDENTIALS' }, 401);
    }

    // --- 1. Kullanıcı + organizasyon ---
    const { data: user } = await admin
      .from('users')
      .select(
        'id, org_id, org_role, auth_email, is_active, failed_attempts, locked_until, ' +
          'organizations!users_org_id_fkey!inner(id, kind, is_subscriber, is_active)',
      )
      .eq('user_code', userCode)
      .maybeSingle();

    // Kullanıcı yoksa bile aynı cevap: var/yok bilgisi sızdırılmaz.
    if (!user) {
      await audit(userCode, portal, false, 'NO_USER', ip);
      return json({ error: 'INVALID_CREDENTIALS' }, 401);
    }

    const org = user.organizations as unknown as {
      id: string;
      kind: OrgPortal;
      is_subscriber: boolean;
      is_active: boolean;
    };

    // --- 2. Kilit ---
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await audit(userCode, portal, false, 'LOCKED', ip);
      return json({ error: 'ACCOUNT_LOCKED', retryAfter: LOCK_SECONDS }, 423);
    }

    // --- 3. Kapı doğru mu: portal ↔ org.kind, mode ↔ is_subscriber ---
    const portalOk = org.kind === portal;
    const modeOk = mode === 'subscriber' ? org.is_subscriber : !org.is_subscriber;
    const activeOk = user.is_active && org.is_active;

    // --- 4. Misafir ise sponsor VKN bir KİMLİK FAKTÖRÜDÜR ---
    let sponsorOk = true;
    if (mode === 'guest') {
      const { data: sponsor } = await admin
        .from('organizations')
        .select('id, kind')
        .eq('vkn_tc', sponsorVkn)
        .maybeSingle();

      if (!sponsor || sponsor.kind === org.kind) {
        sponsorOk = false;
      } else {
        // Karşı tarafla aramızda AKTİF bir ilişki kenarı olmak zorunda.
        const mfr = org.kind === 'manufacturer' ? org.id : sponsor.id;
        const rtl = org.kind === 'retailer' ? org.id : sponsor.id;

        const { data: rel } = await admin
          .from('relationships')
          .select('id, status')
          .eq('manufacturer_org_id', mfr)
          .eq('retailer_org_id', rtl)
          .maybeSingle();

        sponsorOk = rel?.status === 'active';
      }
    }

    if (!portalOk || !modeOk || !activeOk || !sponsorOk) {
      const reason = !portalOk
        ? 'WRONG_PORTAL'
        : !modeOk
          ? 'WRONG_MODE'
          : !activeOk
            ? 'INACTIVE'
            : 'NO_ACTIVE_RELATIONSHIP';
      await audit(userCode, portal, false, reason, ip);
      // Şifre doğru olsa bile burada durulur; ayrım istemciye gösterilmez.
      return json({ error: 'INVALID_CREDENTIALS' }, 401);
    }

    // --- 5. Şifre ---
    const anon = anonClient();
    const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({
      email: user.auth_email,
      password,
    });

    if (signInError || !signIn.session) {
      const attempts = (user.failed_attempts ?? 0) + 1;
      await admin
        .from('users')
        .update({
          failed_attempts: attempts,
          locked_until:
            attempts >= MAX_ATTEMPTS
              ? new Date(Date.now() + LOCK_SECONDS * 1000).toISOString()
              : null,
        })
        .eq('id', user.id);

      await audit(userCode, portal, false, 'BAD_PASSWORD', ip);
      return json({ error: 'INVALID_CREDENTIALS' }, 401);
    }

    // --- 6. Başarılı: sayaç sıfırlanır ---
    await admin
      .from('users')
      .update({ failed_attempts: 0, locked_until: null })
      .eq('id', user.id);

    await audit(userCode, portal, true, null, ip);

    return json({
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      org: { id: org.id, kind: org.kind, isSubscriber: org.is_subscriber },
      orgRole: user.org_role,
    });
  } catch (e) {
    // Hata detayı istemciye SIZDIRILMAZ; sunucu log'unda kalır.
    console.error('login failed', e);
    return json({ error: 'INTERNAL' }, 500);
  }
});
