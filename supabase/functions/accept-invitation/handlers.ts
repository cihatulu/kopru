import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { json } from '../_shared/cors.ts';

const INVITE_COLUMNS =
  'id, token, inviter_org_id, company_name, email, phone, authorized_name,' +
  ' vkn_tc, discount_rate, expires_at, used_at, revoked_at';

/** Davetin kullanılabilir olup olmadığı — tek yerde karar verilir. */
function invalidReason(row: {
  used_at: string | null;
  revoked_at: string | null;
  expires_at: string;
}): 'ALREADY_USED' | 'REVOKED' | 'EXPIRED' | null {
  if (row.used_at) return 'ALREADY_USED';
  if (row.revoked_at) return 'REVOKED';
  if (new Date(row.expires_at).getTime() <= Date.now()) return 'EXPIRED';
  return null;
}

function normalizeVkn(v: string): string {
  return v.replace(/[\s.-]/g, '');
}

/** src/lib/tckn.ts ile aynı kural — Deno tarafı src'yi import edemediği için tekrar. */
function validVkn(v: string): boolean {
  return /^\d{10}$/.test(v) || /^[1-9]\d{10}$/.test(v);
}

/** src/constants ile aynı: en az 8 karakter, bir harf ve bir rakam. */
function validPassword(p: string): boolean {
  return p.length >= 8 && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(p) && /\d/.test(p);
}

/**
 * Davet ekranının açılış sorgusu.
 *
 * Yalnız ekranın yazması gereken kadarını döner — davet edenin adı ve tipi.
 * E-posta/telefon gibi öneriler de dönüyor çünkü formu ön doldururlar; bunlar
 * zaten daveti gönderenin karşı taraf hakkında girdiği bilgilerdir.
 */
export async function peekInvitation(admin: SupabaseClient, token: string): Promise<Response> {
  const { data: invite } = await admin
    .from('invitations')
    .select(INVITE_COLUMNS)
    .eq('token', token)
    .maybeSingle();

  if (!invite) return json({ error: 'INVITATION_NOT_FOUND' }, 404);

  const reason = invalidReason(invite);
  if (reason) return json({ error: reason }, 410);

  const { data: inviter } = await admin
    .from('organizations')
    .select('id, kind, company_name')
    .eq('id', invite.inviter_org_id)
    .maybeSingle();

  if (!inviter) return json({ error: 'INVITATION_NOT_FOUND' }, 404);

  return json({
    inviterName: inviter.company_name,
    inviterKind: inviter.kind,
    targetKind: inviter.kind === 'manufacturer' ? 'retailer' : 'manufacturer',
    companyName: invite.company_name,
    email: invite.email,
    phone: invite.phone,
    authorizedName: invite.authorized_name,
    /** Doluysa form VKN alanını kilitler. */
    vknTc: invite.vkn_tc,
    expiresAt: invite.expires_at,
  });
}

interface AcceptBody {
  vknTc?: string;
  companyName?: string;
  password?: string;
  authorizedName?: string;
  email?: string;
  phone?: string;
}

export async function acceptInvitation(
  admin: SupabaseClient,
  token: string,
  body: AcceptBody,
): Promise<Response> {
  const vkn = normalizeVkn(body.vknTc ?? '');
  const companyName = (body.companyName ?? '').trim();
  const password = body.password ?? '';

  if (!validVkn(vkn)) return json({ error: 'INVALID_VKN' }, 400);
  if (companyName.length < 2) return json({ error: 'INVALID_COMPANY_NAME' }, 400);
  if (!validPassword(password)) return json({ error: 'WEAK_PASSWORD' }, 400);

  const { data: invite } = await admin
    .from('invitations')
    .select(INVITE_COLUMNS)
    .eq('token', token)
    .maybeSingle();

  if (!invite) return json({ error: 'INVITATION_NOT_FOUND' }, 404);

  const reason = invalidReason(invite);
  if (reason) return json({ error: reason }, 410);

  // VKN'ye kilitli davet başkasına devredilemez.
  if (invite.vkn_tc && invite.vkn_tc !== vkn) return json({ error: 'VKN_MISMATCH' }, 403);

  const { data: inviter } = await admin
    .from('organizations')
    .select('id, kind, company_name')
    .eq('id', invite.inviter_org_id)
    .maybeSingle();

  if (!inviter) return json({ error: 'INVITATION_NOT_FOUND' }, 404);
  if (vkn === (await ownVkn(admin, inviter.id))) return json({ error: 'SELF_REFERENCE' }, 400);

  // ATOMİK TÜKETİM: iki kişi aynı linki aynı anda açarsa yalnız biri geçer.
  // Sonraki adımlar düşerse davet geri açılır (aşağıdaki release).
  const { data: claimed } = await admin
    .from('invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id)
    .is('used_at', null)
    .select('id')
    .maybeSingle();

  if (!claimed) return json({ error: 'ALREADY_USED' }, 410);

  const release = async () => {
    await admin.from('invitations').update({ used_at: null }).eq('id', invite.id);
  };

  try {
    return await provision(admin, { invite, inviter, vkn, companyName, password, body });
  } catch (e) {
    await release();
    throw e;
  }
}

async function ownVkn(admin: SupabaseClient, orgId: string): Promise<string> {
  const { data } = await admin
    .from('organizations')
    .select('vkn_tc')
    .eq('id', orgId)
    .maybeSingle();
  return String(data?.vkn_tc ?? '');
}

interface ProvisionInput {
  invite: { id: string; discount_rate: number };
  inviter: { id: string; kind: string; company_name: string };
  vkn: string;
  companyName: string;
  password: string;
  body: AcceptBody;
}

/**
 * Org + ilişki + giriş hesabı.
 *
 * Davet edilen ABONE OLARAK açılmaz — misafirdir (`is_subscriber = false`).
 * Kendi paneli, "kendi panelimi açmak istiyorum" talebiyle admin onayından
 * geçer (PLAN §5). Davet yalnız ilişkiyi ve girişi kurar.
 */
async function provision(admin: SupabaseClient, input: ProvisionInput): Promise<Response> {
  const { invite, inviter, vkn, companyName, password, body } = input;
  const targetKind = inviter.kind === 'manufacturer' ? 'retailer' : 'manufacturer';

  const { data: existingOrg } = await admin
    .from('organizations')
    .select('id, kind, is_subscriber')
    .eq('vkn_tc', vkn)
    .maybeSingle();

  let orgId: string;
  let orgCreated = false;

  if (existingOrg) {
    // VKN yakınsaması (ERROR_PROTOCOLS #14): kopya org AÇILMAZ.
    if (existingOrg.kind !== targetKind) return json({ error: 'KIND_MISMATCH' }, 409);
    orgId = existingOrg.id;
  } else {
    const { data: created, error } = await admin
      .from('organizations')
      .insert({
        kind: targetKind,
        company_name: companyName,
        vkn_tc: vkn,
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        authorized_name: body.authorizedName?.trim() || null,
        is_subscriber: false,
        created_by_org_id: inviter.id,
      })
      .select('id')
      .single();

    if (error || !created) {
      console.error('org oluşturulamadı', error);
      return json({ error: 'ORG_CREATE_FAILED' }, 500);
    }
    orgId = created.id;
    orgCreated = true;
  }

  const manufacturerOrgId = inviter.kind === 'manufacturer' ? inviter.id : orgId;
  const retailerOrgId = inviter.kind === 'retailer' ? inviter.id : orgId;

  const { data: rel } = await admin
    .from('relationships')
    .select('id, status')
    .eq('manufacturer_org_id', manufacturerOrgId)
    .eq('retailer_org_id', retailerOrgId)
    .maybeSingle();

  if (!rel) {
    // İki taraf da açıkça rıza gösterdi: gönderen daveti yazdı, alan kabul etti.
    // Bu yüzden `pending` değil, doğrudan `active`.
    const { error } = await admin.from('relationships').insert({
      manufacturer_org_id: manufacturerOrgId,
      retailer_org_id: retailerOrgId,
      status: 'active',
      initiated_by_org_id: inviter.id,
      discount_rate: invite.discount_rate,
      activated_at: new Date().toISOString(),
    });
    if (error) {
      console.error('ilişki kurulamadı', error);
      return json({ error: 'RELATIONSHIP_FAILED' }, 500);
    }
  } else if (rel.status !== 'active') {
    await admin
      .from('relationships')
      .update({ status: 'active', activated_at: new Date().toISOString() })
      .eq('id', rel.id);
  }

  const account = await ensureOwner(admin, orgId, vkn, companyName, password);
  if (account instanceof Response) return account;

  await admin
    .from('invitations')
    .update({ used_by_org_id: orgId })
    .eq('id', invite.id);

  await admin.from('system_logs').insert({
    actor_org_id: inviter.id,
    action: 'invitation.accepted',
    entity: 'invitations',
    entity_id: invite.id,
    meta: { org_id: orgId, org_created: orgCreated, account_created: account.created },
  });

  return json({
    ok: true,
    userCode: vkn,
    sponsorVkn: await ownVkn(admin, inviter.id),
    orgCreated,
    accountCreated: account.created,
  });
}

/**
 * Giriş hesabı.
 *
 * Org'un zaten bir owner'ı varsa şifre EZİLMEZ — davet linkiyle var olan bir
 * firmanın şifresini değiştirmek, linki ele geçirene hesabı vermek olurdu.
 */
async function ensureOwner(
  admin: SupabaseClient,
  orgId: string,
  userCode: string,
  companyName: string,
  password: string,
): Promise<{ created: boolean } | Response> {
  const { data: existing } = await admin
    .from('users')
    .select('id')
    .eq('org_id', orgId)
    .eq('org_role', 'owner')
    .maybeSingle();

  if (existing) return { created: false };

  const authEmail = `${userCode}@users.kopru.local`;

  // KİLİTLİ KURAL 2: şifre yalnız auth.admin üzerinden yazılır.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: { org_id: orgId, company_name: companyName },
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
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    console.error('users satırı yazılamadı', insertError);
    return json({ error: 'USER_INSERT_FAILED' }, 500);
  }

  return { created: true };
}
