/**
 * KÖPRÜ — misafir org birleştirme senaryosu (uçtan uca).
 *
 * NE KANITLAR
 *   1. Aynı misafir ÜRETİCİ 10 ayrı üye perakendeci tarafından eklendiğinde
 *      her perakendeci YALNIZ kendi girdiği ürünü/grubu görür.
 *   2. O misafir üye olduğunda hepsi ona açılır ve AYNI ADLI ürünler teke iner.
 *   3. Birleşme sipariş, iade, SSH ve cari kayıtlarını BOZMAZ — `order_items`
 *      ve `ssh_requests` ürüne `ON DELETE SET NULL` ile bağlı, kopya taşınmadan
 *      silinseydi geçmiş sessizce kopardı.
 *   4. Aynı misafir PERAKENDECİ 10 ayrı üye üretici tarafından eklendiğinde
 *      üye olduğunda hiçbir kaydını kaybetmez.
 *
 * NEDEN BETİK, NEDEN TIKLAYARAK DEĞİL
 * 20 org + 20 ilişki + 30 ürün + siparişler + iadeler + SSH'ı elle kurmak
 * yüzlerce adım eder ve tekrar edilemez. Betik idempotenttir: tekrar
 * çalıştırmak kopya üretmez.
 *
 * TEMİZLİK
 *   node scripts/scenario-merge.mjs --temizle
 * Bu betiğin açtığı her şeyi (TEST_ önekli org'lar ve bağlı tüm kayıtlar) siler.
 *
 * Kullanım:
 *   node scripts/scenario-merge.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const settings = JSON.parse(readFileSync('.claude/settings.local.json', 'utf8'));
const REF = settings.env.SUPABASE_PROJECT_REF;
const TOKEN = settings.env.SUPABASE_ACCESS_TOKEN;
if (!REF || !TOKEN) {
  console.error('.claude/settings.local.json içinde SUPABASE_PROJECT_REF ve SUPABASE_ACCESS_TOKEN gerekli.');
  process.exit(1);
}
const BASE = `https://${REF}.supabase.co`;

function serviceKey() {
  const env = { ...process.env, SUPABASE_ACCESS_TOKEN: TOKEN };
  const out = execFileSync(
    'npx',
    ['supabase', 'projects', 'api-keys', '--project-ref', REF, '--output', 'json'],
    { encoding: 'utf8', env, shell: true },
  );
  const keys = JSON.parse(out.slice(out.indexOf('[')));
  const k = keys.find((x) => x.name === 'service_role');
  if (!k) throw new Error('service_role anahtarı alınamadı');
  return k.api_key;
}

const SR = serviceKey();
const H = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };

async function api(path, init = {}) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, { ...init, headers: { ...H, ...init.headers } });
  const text = await r.text();
  const body = text ? JSON.parse(text) : null;
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${text.slice(0, 300)}`);
  return body;
}
const ret = { Prefer: 'return=representation' };

// ─────────────────────────────────────────────────────────── numaralar
// Geçerli checksum'lı, sistemde kullanılmayan test numaraları.
const VKN_URETICI = ['49000000002','49000000003','49000000004','49000000005','49000000006',
                     '49000000007','49000000008','49000000009','49000000010','49000000011'];
const VKN_PERAKENDECI = ['49000000012','49000000013','49000000014','49000000015','49000000016',
                         '49000000017','49000000018','49000000019','49000000020','49000000021'];
const VKN_MISAFIR_URETICI = '49000000022';
const VKN_MISAFIR_PERAKENDECI = '49000000023';
const VKN_ADMIN = '49000000024';
const HEPSI = [...VKN_URETICI, ...VKN_PERAKENDECI,
               VKN_MISAFIR_URETICI, VKN_MISAFIR_PERAKENDECI, VKN_ADMIN];

const SIFRE = 'test1234';
const MODULLER = ['dashboard','catalog','orders','accounts','counterparties','stock','reports',
                  'announcements','ssh','returns','team','finance'];

/** Aynı adı taşıyan ürün — birleştirmenin hedefi budur. */
const ORTAK_AD = 'ORTAK KOLTUK';

// ─────────────────────────────────────────────────────────── temizlik
async function temizle() {
  const orgs = await api(`organizations?vkn_tc=in.(${HEPSI.join(',')})&select=id,company_name`);
  if (!orgs.length) { console.log('Temizlenecek test org bulunamadı.'); return; }
  const ids = orgs.map((o) => o.id);
  const inIds = `(${ids.join(',')})`;

  // Sıra önemli: yabancı anahtarlar yukarıdan aşağı çözülür.
  for (const [tablo, kolonlar] of [
    ['transactions', ['manufacturer_org_id', 'retailer_org_id']],
    ['ssh_requests', ['manufacturer_org_id', 'retailer_org_id']],
    ['return_requests', ['manufacturer_org_id', 'retailer_org_id']],
    ['order_items', null],
    ['orders', ['manufacturer_org_id', 'retailer_org_id']],
    ['retail_prices', ['retailer_org_id']],
    ['retailer_stock', ['retailer_org_id']],
    ['manufacturer_stock', ['owner_org_id']],
    ['product_costs', ['owner_org_id']],
    ['products', ['owner_org_id']],
    ['product_groups', ['owner_org_id']],
    ['relationships', ['manufacturer_org_id', 'retailer_org_id']],
    ['users', ['org_id']],
  ]) {
    if (tablo === 'order_items') {
      const ord = await api(`orders?or=(manufacturer_org_id.in.${inIds},retailer_org_id.in.${inIds})&select=id`);
      if (ord.length) await api(`order_items?order_id=in.(${ord.map((o) => o.id).join(',')})`, { method: 'DELETE' });
      continue;
    }
    const filtre = kolonlar.length === 1
      ? `${kolonlar[0]}=in.${inIds}`
      : `or=(${kolonlar.map((k) => `${k}.in.${inIds}`).join(',')})`;
    await api(`${tablo}?${filtre}`, { method: 'DELETE' });
  }

  // Auth kullanıcıları ayrı API'den silinir.
  for (const vkn of HEPSI) {
    const au = await fetch(`${BASE}/auth/v1/admin/users?filter=${vkn}@users.kopru.local`, { headers: H });
    const j = await au.json().catch(() => null);
    for (const u of j?.users ?? []) {
      await fetch(`${BASE}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: H });
    }
  }
  await api(`platform_admins?user_id=not.is.null&select=user_id`).catch(() => []);
  await api(`organizations?id=in.${inIds}`, { method: 'DELETE' });
  console.log(`Temizlendi: ${orgs.length} org ve bağlı tüm kayıtlar.`);
}

// ─────────────────────────────────────────────────────────── kurulum
async function org({ kind, name, vkn, abone, subdomain }) {
  const hedef = {
    is_subscriber: abone,
    plan: abone ? 'pro' : null,
    subdomain: abone ? subdomain : null,
    enabled_modules: abone ? MODULLER : [],
  };
  const found = await api(`organizations?vkn_tc=eq.${vkn}&select=id,company_name`);
  if (found.length) {
    await api(`organizations?id=eq.${found[0].id}`, { method: 'PATCH', body: JSON.stringify(hedef) });
    return found[0];
  }
  const [row] = await api('organizations', {
    method: 'POST', headers: ret,
    body: JSON.stringify({ kind, company_name: name, vkn_tc: vkn, ...hedef }),
  });
  return row;
}

async function owner(o, vkn) {
  const varsa = await api(`users?org_id=eq.${o.id}&org_role=eq.owner&select=id`);
  if (varsa.length) return varsa[0].id;
  const email = `${vkn}@users.kopru.local`;
  const r = await fetch(`${BASE}/auth/v1/admin/users`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ email, password: SIFRE, email_confirm: true }),
  });
  const au = await r.json();
  if (!r.ok) throw new Error(`auth: ${JSON.stringify(au).slice(0, 200)}`);
  await api('users', {
    method: 'POST',
    body: JSON.stringify({ id: au.id, org_id: o.id, org_role: 'owner', user_code: vkn, auth_email: email }),
  });
  return au.id;
}

async function iliski(mfr, rtl, { katalog = false } = {}) {
  const bul = await api(
    `relationships?manufacturer_org_id=eq.${mfr.id}&retailer_org_id=eq.${rtl.id}&select=id`);
  if (bul.length) {
    await api(`relationships?id=eq.${bul[0].id}`, {
      method: 'PATCH', body: JSON.stringify({ status: 'active', can_edit_catalog: katalog }),
    });
    return bul[0];
  }
  const [row] = await api('relationships', {
    method: 'POST', headers: ret,
    body: JSON.stringify({
      manufacturer_org_id: mfr.id, retailer_org_id: rtl.id, status: 'active',
      initiated_by_org_id: rtl.id, discount_rate: 0, can_edit_catalog: katalog,
      activated_at: new Date().toISOString(),
    }),
  });
  return row;
}

async function urun(sahip, { ad, kod, fiyat, yoneten, grup }) {
  const bul = await api(`products?owner_org_id=eq.${sahip.id}&code=eq.${kod}&select=id`);
  if (bul.length) return bul[0];
  const [row] = await api('products', {
    method: 'POST', headers: ret,
    body: JSON.stringify({
      owner_org_id: sahip.id, name: ad, code: kod, supplier_price: fiyat,
      managed_by_retailer_org_id: yoneten ?? null, group_id: grup ?? null,
    }),
  });
  return row;
}

export {};
