/**
 * Müşteriyi (karşı tarafı) GİRİŞ BİLGİLERİYLE birlikte açar.
 *
 * `add_counterparty` RPC'si kaydı ve ilişkiyi kurar ama giriş hesabı açmaz —
 * o iş service role ister (kilitli kural 2: şifre yalnız `auth.admin` ile
 * yazılır). Bu fonksiyon ikisini birleştirir: önce ilişki, sonra hesap.
 *
 * Sıra önemli: ilişki kurulamazsa hesap da açılmaz. Tersi olsaydı ortada
 * hiçbir müşteriye bağlı olmayan yetim bir giriş hesabı kalırdı.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

interface Body {
  vknTc?: string;
  companyName?: string;
  authorizedName?: string;
  email?: string;
  phone?: string;
  address?: string;
  discountRate?: number;
  /** Giriş kimliği. Verilmezse VKN kullanılır (kilitli kural 18). */
  userCode?: string;
  /** Boş bırakılırsa hesap açılmaz — yalnız cari kart oluşur. */
  password?: string;
}

function validPassword(p: string): boolean {
  return p.length >= 8 && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(p) && /\d/.test(p);
}

/** users.user_code CHECK kısıtı ile aynı: küçük harf ve rakam, 3-32. */
function validUserCode(c: string): boolean {
  return /^[a-z0-9]{3,32}$/.test(c);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const header = req.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return json({ error: 'UNAUTHORIZED' }, 401);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: 'BAD_REQUEST' }, 400);
  }

  const vkn = (body.vknTc ?? '').replace(/[\s.-]/g, '');
  const password = body.password ?? '';
  const userCode = (body.userCode ?? vkn).toLowerCase();

  if (password && !validPassword(password)) return json({ error: 'WEAK_PASSWORD' }, 400);
  if (password && !validUserCode(userCode)) return json({ error: 'INVALID_USER_CODE' }, 400);

  try {
    // 1) İlişkiyi ÇAĞIRANIN yetkisiyle kur.
    //
    // Service role ile yapılsaydı "kim kimi ekleyebilir" kuralları (abone mi,
    // rolü uygun mu, aynı kind mi) atlanırdı. RPC bunların hepsini uygular.
    const caller = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
    );

    const { data: result, error: rpcError } = await caller.rpc('add_counterparty', {
      p_vkn_tc: vkn,
      p_company_name: body.companyName ?? null,
      p_email: body.email ?? null,
      p_phone: body.phone ?? null,
      p_authorized_name: body.authorizedName ?? null,
      p_discount_rate: body.discountRate ?? 0,
    });

    if (rpcError) {
      // RPC'nin kendi hata kodları (SELF_REFERENCE, KIND_MISMATCH, …) korunur.
      return json({ error: rpcError.message }, 400);
    }

    const row = result as Record<string, unknown>;
    const orgId = String(row.org_id);

    if (body.address) {
      await admin.from('organizations').update({ address: body.address }).eq('id', orgId);
    }

    // 2) Şifre verilmediyse yalnız cari kart açılır; giriş hesabı istenmemiştir.
    if (!password) {
      return json({
        orgId,
        alreadyExisted: Boolean(row.already_existed),
        status: row.status,
        accountCreated: false,
      });
    }

    const { data: existing } = await admin
      .from('users')
      .select('id, user_code')
      .eq('org_id', orgId)
      .eq('org_role', 'owner')
      .maybeSingle();

    // Zaten girişi olan bir firmanın şifresi BURADAN değiştirilmez; bu bir
    // "müşteri ekleme" akışıdır, hesap ele geçirme yolu değil.
    if (existing) {
      return json({
        orgId,
        alreadyExisted: Boolean(row.already_existed),
        status: row.status,
        accountCreated: false,
        userCode: existing.user_code,
      });
    }

    const authEmail = `${userCode}@users.kopru.local`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: { org_id: orgId },
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
      email: body.email ?? null,
      phone: body.phone ?? null,
      full_name: body.authorizedName ?? null,
    });

    if (insertError) {
      await admin.auth.admin.deleteUser(created.user.id);
      console.error('users satırı yazılamadı', insertError);
      // En sık sebep: kullanıcı kodu başkasında.
      return json({ error: 'USER_CODE_TAKEN' }, 409);
    }

    return json({
      orgId,
      alreadyExisted: Boolean(row.already_existed),
      status: row.status,
      accountCreated: true,
      userCode,
    });
  } catch (e) {
    console.error('create-customer failed', e);
    return json({ error: 'INTERNAL' }, 500);
  }
});
