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
  /**
   * WhatsApp ile paylaşılacak bilgi bağlantısı istenip istenmediği.
   *
   * Davet akışında hesap ZATEN burada kurulur; link kabul etmeye değil, karşı
   * tarafa giriş bilgilerini göstermeye yarar. Bu yüzden davet satırı
   * kullanılmış olarak yazılır — kimse onunla ikinci bir kayıt açamaz.
   */
  withInviteLink?: boolean;
}

/** Davet jetonu — tahmin edilemez olmak zorunda, istemciden GELMEZ. */
function newInviteToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Bilgi sayfası bağlantısı için kullanılmış davet satırı yazar. */
async function createInviteLink(
  inviterOrgId: string,
  orgId: string,
  body: Body,
): Promise<string | null> {
  const token = newInviteToken();
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 86_400_000);

  const { error } = await admin.from('invitations').insert({
    token,
    inviter_org_id: inviterOrgId,
    company_name: body.companyName ?? null,
    phone: body.phone ?? null,
    authorized_name: body.authorizedName ?? null,
    vkn_tc: (body.vknTc ?? '').replace(/[\s.-]/g, '') || null,
    discount_rate: 0,
    expires_at: expires.toISOString(),
    used_at: now.toISOString(),
    used_by_org_id: orgId,
  });

  if (error) {
    // Bağlantı üretilemese de firma ve hesap kuruldu; işlem başarısız sayılmaz.
    console.error('davet baglantisi yazilamadi', error);
    return null;
  }
  return token;
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
  const password = body.password || '1q2w3e4r';
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

    // Bağlantı isteniyorsa çağıranın org'u gerekir; RPC yalnız karşı tarafı döner.
    let inviteToken: string | null = null;
    if (body.withInviteLink) {
      const { data: myOrg } = await caller.rpc('get_my_org_id');
      if (myOrg) inviteToken = await createInviteLink(String(myOrg), orgId, body);
    }

    // 2) Şifre verilmediyse yalnız cari kart açılır; giriş hesabı istenmemiştir.
    if (!password) {
      return json({
        orgId,
        alreadyExisted: Boolean(row.already_existed),
        status: row.status,
        accountCreated: false,
        inviteToken,
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
        inviteToken,
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
      inviteToken,
    });
  } catch (e) {
    console.error('create-customer failed', e);
    return json({ error: 'INTERNAL' }, 500);
  }
});
