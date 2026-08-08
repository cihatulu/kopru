/**
 * Organizasyona personel hesabı açar.
 *
 * Org sahibi çağırır. Şifre yalnız `auth.admin` üzerinden yazılır (kilitli
 * kural 2); `password_hash` kolonu yoktur ve olmayacaktır.
 *
 * Kullanıcı kodu org'un VKN'sinden TÜRETİLİR (`<vkn>01`, `<vkn>02` …) çünkü
 * giriş ekranı herkesi tek bir "kullanıcı kodu" alanıyla karşılar (kilitli
 * kural 18): personelin de aynı biçimde tanımlanabilmesi gerekir.
 *
 * Kod TÜMÜYLE RAKAMDIR, tire yoktur. `login` gelen kodu `[\s.-]` ayraçlarından
 * temizler (VKN'yi "123-456 7890" diye yazan kullanıcı için); tireli bir kod
 * normalize edildikten sonra hiçbir zaman eşleşmezdi.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';
import { requireOrgOwner } from '../_shared/auth.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

interface Body {
  fullName?: string;
  role?: 'staff' | 'accountant';
  password?: string;
  email?: string;
  phone?: string;
}

function validPassword(p: string): boolean {
  return p.length >= 8 && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(p) && /\d/.test(p);
}

/** Org'un kullanılmayan ilk `<vkn>NN` kodunu bulur. */
async function nextUserCode(orgId: string, vkn: string): Promise<string | null> {
  const { data } = await admin.from('users').select('user_code').eq('org_id', orgId);
  const taken = new Set((data ?? []).map((r) => String(r.user_code)));

  for (let i = 1; i <= 99; i++) {
    const code = `${vkn}${String(i).padStart(2, '0')}`;
    if (!taken.has(code)) return code;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const auth = await requireOrgOwner(req, admin);
  if (auth instanceof Response) return auth;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: 'BAD_REQUEST' }, 400);
  }

  const fullName = (body.fullName ?? '').trim();
  const role = body.role === 'accountant' ? 'accountant' : 'staff';
  const password = body.password ?? '';

  if (fullName.length < 2) return json({ error: 'INVALID_NAME' }, 400);
  if (!validPassword(password)) return json({ error: 'WEAK_PASSWORD' }, 400);

  try {
    const { data: org } = await admin
      .from('organizations')
      .select('id, vkn_tc, company_name')
      .eq('id', auth.orgId)
      .maybeSingle();

    if (!org) return json({ error: 'ORG_NOT_FOUND' }, 404);

    const userCode = await nextUserCode(auth.orgId, String(org.vkn_tc));
    if (!userCode) return json({ error: 'CODE_LIMIT_REACHED' }, 409);

    const authEmail = `${userCode}@users.kopru.local`;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: { org_id: auth.orgId, company_name: org.company_name },
    });

    if (createError || !created.user) {
      console.error('auth user oluşturulamadı', createError);
      return json({ error: 'AUTH_CREATE_FAILED' }, 500);
    }

    const { error: insertError } = await admin.from('users').insert({
      id: created.user.id,
      org_id: auth.orgId,
      org_role: role,
      user_code: userCode,
      auth_email: authEmail,
      full_name: fullName,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
    });

    if (insertError) {
      // users satırı yazılamadıysa yetim auth kaydı bırakma.
      await admin.auth.admin.deleteUser(created.user.id);
      console.error('users satırı yazılamadı', insertError);
      return json({ error: 'USER_INSERT_FAILED' }, 500);
    }

    await admin.from('system_logs').insert({
      actor_user_id: auth.userId,
      actor_org_id: auth.orgId,
      action: 'staff.created',
      entity: 'users',
      entity_id: created.user.id,
      meta: { user_code: userCode, role },
    });

    return json({ userId: created.user.id, userCode, role });
  } catch (e) {
    console.error('create-staff failed', e);
    return json({ error: 'INTERNAL' }, 500);
  }
});
