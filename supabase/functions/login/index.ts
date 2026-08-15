/**
 * KÖPRÜ — Giriş Edge Function.
 *
 * Yetkili (owner) veya Personel (staff/accountant) girişi ayrımı.
 * Personel de sahibi olan firmanın VKN'sini girerek, tik işaretleyip kendi şifresiyle girer.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { projectUrl, publishableKey, secretKey } from '../_shared/keys.ts';
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
  email?: string;
  password?: string;
  userType?: 'owner' | 'staff'; // 'owner' = Yetkili, 'staff' = Personel
}

const normalize = (v: string) => v.replace(/[\s.-]/g, '');

const admin = createClient(
  projectUrl(),
  secretKey(),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function anonClient() {
  return createClient(
    projectUrl(),
    publishableKey(),
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
  await admin.from('login_audit').insert({
    user_code: userCode,
    portal,
    succeeded,
    reason,
    ip,
  });
}

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
  const userType = body.userType;

  try {
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
      (mode === 'guest' && !sponsorVkn) ||
      (userType !== 'owner' && userType !== 'staff')
    ) {
      return json({ error: 'INVALID_CREDENTIALS' }, 401);
    }

    let selectedUser: any = null;
    let selectedOrg: any = null;
    let sessionData: any = null;

    if (userType === 'owner') {
      // --- YETKİLİ GİRİŞİ ---
      const { data: user } = await admin
        .from('users')
        .select(
          'id, org_id, org_role, auth_email, is_active, failed_attempts, locked_until, ' +
            'organizations!users_org_id_fkey!inner(id, kind, is_subscriber, is_active)',
        )
        .eq('user_code', userCode)
        .eq('org_role', 'owner')
        .maybeSingle();

      if (!user) {
        await audit(userCode, portal, false, 'NO_OWNER_USER', ip);
        return json({ error: 'INVALID_CREDENTIALS' }, 401);
      }

      // Kilit kontrolü
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        await audit(userCode, portal, false, 'LOCKED', ip);
        return json({ error: 'ACCOUNT_LOCKED', retryAfter: LOCK_SECONDS }, 423);
      }

      selectedUser = user;
      selectedOrg = user.organizations;

      // Şifre doğrulama
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

      sessionData = signIn;
    } else {
      // --- PERSONEL GİRİŞİ ---
      // Önce VKN'ye sahip organizasyonu bulalım
      const { data: org } = await admin
        .from('organizations')
        .select('id, kind, is_subscriber, is_active')
        .eq('vkn_tc', userCode)
        .maybeSingle();

      if (!org) {
        await audit(userCode, portal, false, 'ORG_NOT_FOUND', ip);
        return json({ error: 'INVALID_CREDENTIALS' }, 401);
      }

      // Bu organizasyondaki tüm aktif personelleri bulalım
      const { data: staffList } = await admin
        .from('users')
        .select('id, org_id, org_role, auth_email, is_active, failed_attempts, locked_until')
        .eq('org_id', org.id)
        .in('org_role', ['staff', 'accountant'])
        .eq('is_active', true);

      if (!staffList || staffList.length === 0) {
        await audit(userCode, portal, false, 'NO_STAFF_MEMBERS', ip);
        return json({ error: 'INVALID_CREDENTIALS' }, 401);
      }

      // Her aktif personeli şifreyle doğrulamayı deneyelim
      const anon = anonClient();
      for (const member of staffList) {
        if (member.locked_until && new Date(member.locked_until) > new Date()) {
          continue; // Kilitli hesapları atla
        }

        const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({
          email: member.auth_email,
          password,
        });

        if (!signInError && signIn.session) {
          selectedUser = member;
          selectedOrg = org;
          sessionData = signIn;
          break; // Doğru personeli bulduk!
        } else {
          const attempts = (member.failed_attempts ?? 0) + 1;
          await admin
            .from('users')
            .update({
              failed_attempts: attempts,
              locked_until:
                attempts >= MAX_ATTEMPTS
                  ? new Date(Date.now() + LOCK_SECONDS * 1000).toISOString()
                  : null,
            })
            .eq('id', member.id);
        }
      }

      if (!selectedUser || !sessionData) {
        await audit(userCode, portal, false, 'BAD_PASSWORD_FOR_ALL_STAFF', ip);
        return json({ error: 'INVALID_CREDENTIALS' }, 401);
      }
    }

    const org = selectedOrg;
    const user = selectedUser;
    const signIn = sessionData;

    // Kapı ve mod doğrulamaları
    const portalOk = org.kind === portal;
    const modeOk = mode === 'subscriber' ? org.is_subscriber : !org.is_subscriber;
    const activeOk = user.is_active && org.is_active;

    let sponsorOk = true;
    let sponsorOrgId: string | null = null;

    if (mode === 'guest') {
      const { data: sponsor } = await admin
        .from('organizations')
        .select('id, kind')
        .eq('vkn_tc', sponsorVkn)
        .maybeSingle();

      if (!sponsor || sponsor.kind === org.kind) {
        sponsorOk = false;
      } else {
        const mfr = org.kind === 'manufacturer' ? org.id : sponsor.id;
        const rtl = org.kind === 'retailer' ? org.id : sponsor.id;

        const { data: rel } = await admin
          .from('relationships')
          .select('id, status')
          .eq('manufacturer_org_id', mfr)
          .eq('retailer_org_id', rtl)
          .maybeSingle();

        sponsorOk = rel?.status === 'active';
        if (sponsorOk) sponsorOrgId = sponsor.id;
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
      return json({ error: 'INVALID_CREDENTIALS' }, 401);
    }

    // Sayaçları sıfırla
    await admin
      .from('users')
      .update({ failed_attempts: 0, locked_until: null })
      .eq('id', user.id);

    // Misafir oturum izolasyonu
    if (sponsorOrgId) {
      await admin.auth.admin.updateUserById(user.id, {
        app_metadata: { sponsor_org_id: sponsorOrgId },
      });
    } else if (mode === 'subscriber') {
      await admin.auth.admin.updateUserById(user.id, {
        app_metadata: { sponsor_org_id: null },
      });
    }

    await audit(userCode, portal, true, null, ip);

    // ZORUNLU: updateUserById app_metadata'yı günceller ama signIn.session.access_token
    // bu güncellemeden ÖNCE imzalandı — içinde eski sponsor_org_id claim'i var.
    // refreshSession ile taze bir JWT alıyoruz; bu JWT güncel app_metadata'yı taşır.
    // Aksi hâlde üye olarak giriş yapan perakendeci yalnız eski sponsor üreticiyi görebilir.
    let finalAccessToken = signIn.session.access_token;
    let finalRefreshToken = signIn.session.refresh_token;
    try {
      const refreshAnon = anonClient();
      const { data: refreshed } = await refreshAnon.auth.refreshSession({
        refresh_token: signIn.session.refresh_token,
      });
      if (refreshed?.session) {
        finalAccessToken = refreshed.session.access_token;
        finalRefreshToken = refreshed.session.refresh_token;
      }
    } catch {
      // Yenileme başarısız olursa orijinal token'ı kullan (yine de giriş olur).
    }

    return json({
      access_token: finalAccessToken,
      refresh_token: finalRefreshToken,
      org: { id: org.id, kind: org.kind, isSubscriber: org.is_subscriber },
      orgRole: user.org_role,
      sponsorOrgId,
    });
  } catch (e) {
    console.error('login failed', e);
    return json({ error: 'INTERNAL' }, 500);
  }
});
