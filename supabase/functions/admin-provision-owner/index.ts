/**
 * Bir organizasyona sahip (owner) girişi açar.
 *
 * "Tek tık aboneye yükseltme"nin ikinci yarısı: RPC bayrağı çevirir, bu fonksiyon
 * o org'un gerçekten giriş yapabilmesini sağlar.
 *
 * Kullanıcı kodu = org'un VKN/TCKN'si (kilitli kural 18). Auth e-postası bundan
 * türetilir ama `users.auth_email` kolonunda AÇIKÇA saklanır — kullanıcı kodu
 * ileride değişse bile auth kaydıyla bağ kopmaz.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { projectUrl, publishableKey, secretKey } from '../_shared/keys.ts';
import { corsHeaders, json } from '../_shared/cors.ts';
import { generateTempPassword, requirePlatformAdmin } from '../_shared/auth.ts';

const admin = createClient(
  projectUrl(),
  secretKey(),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  // Service role RLS'i bypass eder; yetki kontrolü elle yapılır.
  const auth = await requirePlatformAdmin(req, admin);
  if (auth instanceof Response) return auth;

  let orgId: string;
  try {
    orgId = ((await req.json()) as { orgId?: string }).orgId ?? '';
  } catch {
    return json({ error: 'BAD_REQUEST' }, 400);
  }
  if (!orgId) return json({ error: 'BAD_REQUEST' }, 400);

  try {
    const { data: org } = await admin
      .from('organizations')
      .select('id, vkn_tc, company_name, email, is_subscriber')
      .eq('id', orgId)
      .maybeSingle();

    if (!org) return json({ error: 'ORG_NOT_FOUND' }, 404);

    // Zaten owner'ı varsa yeni hesap açma — çift hesap, çift giriş demek olurdu.
    const { data: existing } = await admin
      .from('users')
      .select('id, user_code')
      .eq('org_id', orgId)
      .eq('org_role', 'owner')
      .maybeSingle();

    if (existing) {
      return json({ created: false, userCode: existing.user_code });
    }

    const userCode = String(org.vkn_tc);
    const authEmail = `${userCode}@users.kopru.local`;
    const password = generateTempPassword();

    // KİLİTLİ KURAL 2: şifre yalnız auth.admin üzerinden yazılır; password_hash yok.
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: { org_id: orgId, company_name: org.company_name },
    });

    if (createError || !created.user) {
      console.error('auth user oluşturulamadı', createError);
      return json({ error: 'AUTH_CREATE_FAILED' }, 500);
    }

    const { error: insertError } = await admin.from('users').insert({
      id: created.user.id,
      org_id: orgId,
      org_role: 'owner',
      user_code: userCode,
      auth_email: authEmail,
      email: org.email,
    });

    if (insertError) {
      // users satırı yazılamadıysa yetim auth kaydı bırakma.
      await admin.auth.admin.deleteUser(created.user.id);
      console.error('users satırı yazılamadı', insertError);
      return json({ error: 'USER_INSERT_FAILED' }, 500);
    }

    await admin.from('system_logs').insert({
      actor_user_id: auth.userId,
      actor_org_id: orgId,
      action: 'org.owner_provisioned',
      entity: 'users',
      entity_id: created.user.id,
      meta: { user_code: userCode },
    });

    // Geçici şifre YALNIZ burada, bir kez döner; hiçbir yerde saklanmaz.
    // TODO(Faz 9): e-posta altyapısı gelince davet linkine çevrilecek.
    return json({ created: true, userCode, tempPassword: password });
  } catch (e) {
    console.error('provision failed', e);
    return json({ error: 'INTERNAL' }, 500);
  }
});
