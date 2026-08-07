/**
 * KÖPRÜ — test verisi tohumlama (PLAN §11).
 *
 * Kurar: 2 abone üretici, 2 abone perakendeci, 2 misafir (her taraftan biri),
 * aralarında ilişkiler, ürünler (gizli maliyetleriyle) ve bir sipariş.
 *
 * Bu, e2e senaryolarının veri tabanıdır ve İDEMPOTENTTİR — tekrar çalıştırmak
 * kopya kayıt üretmez, mevcutları bulur.
 *
 * Kullanım:
 *   node scripts/seed.mjs
 *
 * Gerekli: .claude/settings.local.json içinde SUPABASE_ACCESS_TOKEN ve
 * SUPABASE_PROJECT_REF. Service role anahtarı CLI'dan geçici olarak alınır,
 * diske YAZILMAZ.
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
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
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${text.slice(0, 200)}`);
  return body;
}

function password() {
  const abc = 'abcdefghjkmnpqrstuvwxyz';
  const num = '23456789';
  const b = randomBytes(16);
  let s = '';
  for (let i = 0; i < 10; i++) s += abc[b[i] % abc.length];
  for (let i = 10; i < 16; i++) s += num[b[i] % num.length];
  return s;
}

const FULL_MODULES = [
  'dashboard', 'catalog', 'orders', 'accounts', 'counterparties',
  'stock', 'reports', 'announcements', 'ssh', 'returns', 'team', 'finance',
];

/**
 * Org bul veya oluştur — vkn_tc UNIQUE olduğu için yakınsama garantili (A3).
 *
 * Mevcut kayıt bulunduğunda abonelik durumu HEDEF DEĞERE ÇEKİLİR. Tohum betiği
 * otoriter olmalı: elle yapılan denemeler (ör. bir org'un misafire düşürülmesi)
 * sonraki çalıştırmada geri alınır, aksi halde e2e senaryoları öngörülemez olur.
 */
async function ensureOrg({ kind, name, vkn, subscriber, plan, subdomain }) {
  const desired = {
    is_subscriber: subscriber,
    plan: subscriber ? plan : null,
    subdomain: subscriber ? subdomain : null,
    enabled_modules: subscriber ? FULL_MODULES : [],
  };

  const found = await api(`organizations?vkn_tc=eq.${vkn}&select=id,company_name,kind`);
  if (found.length) {
    const org = found[0];
    if (org.kind !== kind) {
      throw new Error(
        `${vkn} sistemde '${org.kind}' olarak kayıtlı, tohum '${kind}' bekliyor. ` +
          'Aynı VKN iki tipte olamaz (A15).',
      );
    }
    await api(`organizations?id=eq.${org.id}`, {
      method: 'PATCH',
      body: JSON.stringify(desired),
    });
    return org;
  }

  const [row] = await api('organizations', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ kind, company_name: name, vkn_tc: vkn, ...desired }),
  });
  return row;
}

/** Owner kullanıcısı — user_code org'un VKN'sidir (kilitli kural 18). */
async function ensureOwner(org, vkn) {
  const existing = await api(`users?org_id=eq.${org.id}&org_role=eq.owner&select=id,user_code`);
  const pw = password();
  const authEmail = `${vkn}@users.kopru.local`;

  if (existing.length) {
    await fetch(`${BASE}/auth/v1/admin/users/${existing[0].id}`, {
      method: 'PUT',
      headers: H,
      body: JSON.stringify({ password: pw }),
    });
    return { userCode: existing[0].user_code, password: pw };
  }

  const r = await fetch(`${BASE}/auth/v1/admin/users`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ email: authEmail, password: pw, email_confirm: true }),
  });
  const au = await r.json();
  if (!r.ok) throw new Error(`auth user: ${JSON.stringify(au).slice(0, 200)}`);

  await api('users', {
    method: 'POST',
    body: JSON.stringify({
      id: au.id,
      org_id: org.id,
      org_role: 'owner',
      user_code: vkn,
      auth_email: authEmail,
    }),
  });
  return { userCode: vkn, password: pw };
}

async function ensureRelationship(mfr, rtl, discount) {
  const found = await api(
    `relationships?manufacturer_org_id=eq.${mfr.id}&retailer_org_id=eq.${rtl.id}&select=id`,
  );
  if (found.length) return found[0];
  const [row] = await api('relationships', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      manufacturer_org_id: mfr.id,
      retailer_org_id: rtl.id,
      status: 'active',
      initiated_by_org_id: mfr.id,
      discount_rate: discount,
      activated_at: new Date().toISOString(),
    }),
  });
  return row;
}

async function ensureProduct(org, { name, code, price, cost }) {
  const found = await api(`products?owner_org_id=eq.${org.id}&code=eq.${code}&select=id`);
  if (found.length) return found[0];
  const [row] = await api('products', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ owner_org_id: org.id, name, code, supplier_price: price }),
  });
  // KATMAN 1 — gizli maliyet ayrı tabloya (A4).
  await api('product_costs', {
    method: 'POST',
    body: JSON.stringify({ product_id: row.id, owner_org_id: org.id, cost_price: cost }),
  });
  return row;
}

// ---- Geçerli checksum'lı test numaraları (bkz. src/lib/tckn.ts) ----
// NOT: mfr1 ve rtl1, geliştirme sırasında canlıda oluşturulan kayıtlarla
// eşleşir. VKN organizasyonların yakınsama anahtarı olduğu için (A3) bu
// numaralar değiştirilirse kopya kayıt oluşur, mevcut veriye bağlanılmaz.
const VKN = {
  mfr1: '1981929896',
  mfr2: '1234567890',
  mfrGuest: '5554443334',
  rtl1: '3456789014',
  rtl2: '8123456786',
  rtlGuest: '9012345670',
};

const out = [];

const mfr1 = await ensureOrg({ kind: 'manufacturer', name: 'NLAMAZZİ', vkn: VKN.mfr1,
  subscriber: true, plan: 'pro', subdomain: 'nlamazzi' });
const mfr2 = await ensureOrg({ kind: 'manufacturer', name: 'ANADOLU MOBİLYA', vkn: VKN.mfr2,
  subscriber: true, plan: 'basic', subdomain: 'anadolu' });
const mfrGuest = await ensureOrg({ kind: 'manufacturer', name: 'MİSAFİR ATÖLYE', vkn: VKN.mfrGuest,
  subscriber: false });

const rtl1 = await ensureOrg({ kind: 'retailer', name: 'TEST PERAKENDE', vkn: VKN.rtl1,
  subscriber: true, plan: 'pro', subdomain: 'testperakende' });
const rtl2 = await ensureOrg({ kind: 'retailer', name: 'EGE MAĞAZA', vkn: VKN.rtl2,
  subscriber: true, plan: 'basic', subdomain: 'egemagaza' });
const rtlGuest = await ensureOrg({ kind: 'retailer', name: 'MİSAFİR BAYİ', vkn: VKN.rtlGuest,
  subscriber: false });

for (const [org, vkn, label] of [
  [mfr1, VKN.mfr1, 'Üretici (abone, pro)'],
  [mfr2, VKN.mfr2, 'Üretici (abone, basic)'],
  [mfrGuest, VKN.mfrGuest, 'Üretici (MİSAFİR)'],
  [rtl1, VKN.rtl1, 'Perakendeci (abone, pro)'],
  [rtl2, VKN.rtl2, 'Perakendeci (abone, basic)'],
  [rtlGuest, VKN.rtlGuest, 'Perakendeci (MİSAFİR)'],
]) {
  const cred = await ensureOwner(org, vkn);
  out.push({ label, firma: org.company_name, kod: cred.userCode, sifre: cred.password });
}

// 5 ilişki: misafirler de grafın tam üyesi (A2).
await ensureRelationship(mfr1, rtl1, 10);
await ensureRelationship(mfr1, rtl2, 5);
await ensureRelationship(mfr2, rtl1, 0);
await ensureRelationship(mfr1, rtlGuest, 15);
await ensureRelationship(mfrGuest, rtl1, 8);

await ensureProduct(mfr1, { name: 'Üçlü Koltuk', code: 'KOLTUK-01', price: 10000, cost: 6000 });
await ensureProduct(mfr1, { name: 'Yemek Masası', code: 'MASA-01', price: 7500, cost: 4200 });
await ensureProduct(mfr2, { name: 'Gardırop', code: 'GRD-01', price: 12000, cost: 8000 });
await ensureProduct(mfrGuest, { name: 'El Yapımı Sehpa', code: 'SHP-01', price: 3000, cost: 1800 });

console.log('\nTohumlama tamamlandı.\n');
console.log('Giriş bilgileri (misafirler sponsor VKN ile misafir kapısından girer):\n');
for (const r of out) {
  console.log(`  ${r.label.padEnd(28)} ${r.firma.padEnd(18)} kod=${r.kod}  şifre=${r.sifre}`);
}
console.log('\nMisafir üretici sponsoru : TEST PERAKENDE (' + VKN.rtl1 + ')');
console.log('Misafir perakendeci sponsoru: NLAMAZZİ (' + VKN.mfr1 + ')\n');
