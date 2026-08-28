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
 *   · staff_update — org sahibi, kendi ekibindeki personelin bilgilerini veya
 *     şifresini günceller.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { projectUrl, publishableKey, secretKey } from '../_shared/keys.ts';
import { corsHeaders, json } from '../_shared/cors.ts';
import { generateTempPassword, requirePlatformAdmin } from '../_shared/auth.ts';

const MIN_LENGTH = 8;
const HAS_LETTER_AND_DIGIT = /^(?=.*[A-Za-zÇĞİÖŞÜçğıöşü])(?=.*\d).+$/;

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

function validPassword(p: string): boolean {
  return p.length >= 8 && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(p) && /\d/.test(p);
}

/**
 * Sponsor, MİSAFİR müşterisinin şifresini yeniler.
 */
async function sponsorReset(req: Request, orgId: string, newPassword: string) {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return json({ error: 'UNAUTHORIZED' }, 401);

  const { data: authUser, error: authError } = await admin.auth.getUser(token);
  if (authError || !authUser.user) return json({ error: 'UNAUTHORIZED' }, 401);

  const { data: me } = await admin
    .from('users')
    .select('org_id, org_role, is_active')
    .eq('id', authUser.user.id)
    .maybeSingle();

  if (!me || !me.is_active || me.org_role !== 'owner') return json({ error: 'FORBIDDEN' }, 403);

  const { data: target } = await admin
    .from('organizations')
    .select('id, is_subscriber')
    .eq('id', orgId)
    .maybeSingle();

  if (!target) return json({ error: 'ORG_NOT_FOUND' }, 404);
  if (target.is_subscriber) return json({ error: 'TARGET_IS_SUBSCRIBER' }, 403);

  const { data: edge } = await admin
    .from('relationships')
    .select('id')
    .or(
      `and(manufacturer_org_id.eq.${me.org_id},retailer_org_id.eq.${orgId}),` +
        `and(retailer_org_id.eq.${me.org_id},manufacturer_org_id.eq.${orgId})`,
    )
    .maybeSingle();

  if (!edge) return json({ error: 'NOT_MY_COUNTERPARTY' }, 403);

  const { data: user } = await admin
    .from('users')
    .select('id, user_code')
    .eq('org_id', orgId)
    .eq('org_role', 'owner')
    .maybeSingle();

  if (!user) return json({ error: 'NO_OWNER_USER' }, 404);

  const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });
  if (error) {
    console.error('sponsor sifre guncellemesi basarisiz', error);
    return json({ error: 'UPDATE_FAILED' }, 500);
  }

  await admin.from('users').update({ failed_attempts: 0, locked_until: null }).eq('id', user.id);

  await admin.from('system_logs').insert({
    actor_user_id: authUser.user.id,
    actor_org_id: me.org_id,
    action: 'counterparty.password_reset',
    entity: 'users',
    entity_id: user.id,
    meta: { target_org: orgId },
  });

  return json({ ok: true, userCode: user.user_code });
}

/** Platform admini bir organizasyonun owner şifresini yeniler. */
async function adminReset(req: Request, orgId: string) {
  const auth = await requirePlatformAdmin(req, admin);
  if (auth instanceof Response) return auth;

  const { data: user } = await admin
    .from('users')
    .select('id, user_code, org_id, organizations!users_org_id_fkey(company_name)')
    .eq('org_id', orgId)
    .eq('org_role', 'owner')
    .maybeSingle();

  if (!user) {
    return json({ error: 'NO_OWNER_USER' }, 404);
  }

  const password = generateTempPassword();
  const { error } = await admin.auth.admin.updateUserById(user.id, { password });
  if (error) {
    console.error('sifre guncellenemedi', error);
    return json({ error: 'UPDATE_FAILED' }, 500);
  }

  await admin.from('users').update({ failed_attempts: 0, locked_until: null }).eq('id', user.id);

  await admin.from('system_logs').insert({
    actor_user_id: auth.userId,
    actor_org_id: orgId,
    action: 'user.password_reset',
    entity: 'users',
    entity_id: user.id,
    meta: { by: 'platform_admin' },
  });

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

  const { data: row } = await admin
    .from('users')
    .select('auth_email, org_id')
    .eq('id', me.user.id)
    .maybeSingle();

  let email = row?.auth_email as string | undefined;

  if (!row) {
    const { data: adminRow } = await admin
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', me.user.id)
      .maybeSingle();

    if (adminRow && me.user.email) {
      email = me.user.email;
    } else {
      return json({ error: 'UNAUTHORIZED' }, 401);
    }
  } else if (row.org_id) {
    // Şifre benzersizliği kontrolü (1 yetkili + N personel şifresi aynı olamaz)
    const { data: conflict, error: conflictError } = await admin.rpc('check_staff_password_conflict', {
      p_org_id: row.org_id,
      p_password: newPassword,
      p_exclude_user_id: me.user.id,
    });

    if (conflictError) {
      console.error('Şifre benzersizlik kontrolü hatası:', conflictError);
      return json({ error: 'DB_ERROR' }, 500);
    }

    if (conflict) {
      return json({ error: 'PASSWORD_ALREADY_TAKEN' }, 409);
    }
  }

  const anon = anonClient();
  const { error: signInError } = await anon.auth.signInWithPassword({
    email: email as string,
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

/** Org sahibi kendi ekibindeki personelin bilgilerini veya şifresini günceller. */
async function staffUpdate(
  req: Request,
  targetUserId: string,
  updates: {
    fullName?: string;
    userCode?: string;
    email?: string;
    phone?: string;
    password?: string;
  },
) {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return json({ error: 'UNAUTHORIZED' }, 401);

  const { data: authUser, error: authError } = await admin.auth.getUser(token);
  if (authError || !authUser.user) return json({ error: 'UNAUTHORIZED' }, 401);

  const { data: me } = await admin
    .from('users')
    .select('org_id, org_role, is_active')
    .eq('id', authUser.user.id)
    .maybeSingle();

  if (!me || !me.is_active || me.org_role !== 'owner') return json({ error: 'FORBIDDEN' }, 403);

  // Target kullanıcı aynı org'da mı ve owner değil mi?
  const { data: target } = await admin
    .from('users')
    .select('id, org_id, org_role')
    .eq('id', targetUserId)
    .maybeSingle();

  if (!target) return json({ error: 'USER_NOT_FOUND' }, 404);
  if (target.org_id !== me.org_id) return json({ error: 'FORBIDDEN' }, 403);
  if (target.org_role === 'owner') return json({ error: 'CANNOT_UPDATE_OWNER' }, 400);

  const authUpdates: Record<string, any> = {};
  const dbUpdates: Record<string, any> = {};

  if (updates.fullName !== undefined) {
    dbUpdates.full_name = updates.fullName.trim() || null;
  }
  if (updates.email !== undefined) {
    dbUpdates.email = updates.email.trim() || null;
  }
  if (updates.phone !== undefined) {
    dbUpdates.phone = updates.phone.trim() || null;
  }

  if (updates.userCode) {
    const userCode = updates.userCode.trim().toLowerCase();
    if (userCode.length < 3 || userCode.length > 32 || !/^[a-z0-9]+$/.test(userCode) || !/[a-z]/.test(userCode)) {
      return json({ error: 'INVALID_CODE' }, 400);
    }
    // kod kullanımda mı?
    const { data: existing } = await admin
      .from('users')
      .select('id')
      .eq('user_code', userCode)
      .neq('id', targetUserId)
      .maybeSingle();
    if (existing) return json({ error: 'CODE_ALREADY_TAKEN' }, 409);

    dbUpdates.user_code = userCode;
    const authEmail = `${userCode}@users.kopru.local`;
    dbUpdates.auth_email = authEmail;
    authUpdates.email = authEmail;
  }

  if (updates.password) {
    if (!validPassword(updates.password)) {
      return json({ error: 'WEAK_PASSWORD' }, 400);
    }
    
    // Şifre benzersizliği kontrolü (1 yetkili + N personel şifresi aynı olamaz)
    const { data: conflict, error: conflictError } = await admin.rpc('check_staff_password_conflict', {
      p_org_id: me.org_id,
      p_password: updates.password,
      p_exclude_user_id: targetUserId,
    });

    if (conflictError) {
      console.error('Şifre benzersizlik kontrolü hatası:', conflictError);
      return json({ error: 'DB_ERROR' }, 500);
    }

    if (conflict) {
      return json({ error: 'PASSWORD_ALREADY_TAKEN' }, 409);
    }

    authUpdates.password = updates.password;
  }

  // 1. auth.users güncelle
  if (Object.keys(authUpdates).length > 0) {
    const { error: authError } = await admin.auth.admin.updateUserById(targetUserId, authUpdates);
    if (authError) {
      console.error('auth update failed', authError);
      return json({ error: 'AUTH_UPDATE_FAILED' }, 500);
    }
  }

  // 2. public.users güncelle
  if (Object.keys(dbUpdates).length > 0) {
    const { error: dbError } = await admin.from('users').update(dbUpdates).eq('id', targetUserId);
    if (dbError) {
      console.error('db update failed', dbError);
      return json({ error: 'DB_UPDATE_FAILED' }, 500);
    }
  }

  // Şifre değiştiyse kilitleri aç
  if (updates.password) {
    await admin.from('users').update({ failed_attempts: 0, locked_until: null }).eq('id', targetUserId);
  }

  await admin.from('system_logs').insert({
    actor_user_id: authUser.user.id,
    actor_org_id: me.org_id,
    action: 'staff.updated',
    entity: 'users',
    entity_id: targetUserId,
    meta: { updates: Object.keys(dbUpdates) },
  });

  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  let body: {
    mode?: string;
    orgId?: string;
    userId?: string;
    newPassword?: string;
    currentPassword?: string;
    updates?: {
      fullName?: string;
      userCode?: string;
      email?: string;
      phone?: string;
      password?: string;
    };
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
    if (body.mode === 'sponsor_reset') {
      if (!body.orgId || !body.newPassword) return json({ error: 'BAD_REQUEST' }, 400);
      if (body.newPassword.length < 8) return json({ error: 'WEAK_PASSWORD' }, 400);
      return await sponsorReset(req, body.orgId, body.newPassword);
    }
    if (body.mode === 'self') {
      if (!body.currentPassword || !body.newPassword) {
        return json({ error: 'BAD_REQUEST' }, 400);
      }
      return await selfChange(req, body.currentPassword, body.newPassword);
    }
    if (body.mode === 'staff_update') {
      if (!body.userId || !body.updates) {
        return json({ error: 'BAD_REQUEST' }, 400);
      }
      return await staffUpdate(req, body.userId, body.updates);
    }
    return json({ error: 'BAD_REQUEST' }, 400);
  } catch (e) {
    console.error('update-user-password failed', e);
    return json({ error: 'INTERNAL' }, 500);
  }
});
