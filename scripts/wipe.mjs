/**
 * KÖPRÜ — sistemi sıfırla.
 *
 * Platform admini DIŞINDA her şeyi siler: tüm organizasyonlar, kullanıcılar
 * ve onlara bağlı bütün kayıtlar (ürün, stok, sipariş, cari, iade, SSH,
 * duyuru, davet, lead, denetim kayıtları).
 *
 * GERİ DÖNÜŞÜ YOKTUR. Cari hareketler dahil her şey gider — kilitli kural 7
 * normalde bu kayıtları değişmez sayar ve düzeltmeyi ters kayıtla yaptırır;
 * burada bilinçli olarak tam temizlik yapılıyor.
 *
 * NEDEN BETİK
 * Silme sırası yabancı anahtar grafiğine uymak zorunda. Elle SQL yazmak hem
 * proje kuralına aykırı (kilitli kural 1) hem de tek bir sıra hatasında
 * yarım silinmiş bir veritabanı bırakır. Betik sırayı sabitler, neyi
 * sildiğini sayar ve tekrar çalıştırılabilir.
 *
 * Kullanım:
 *   node scripts/wipe.mjs --onayla
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

if (!process.argv.includes('--onayla')) {
  console.error('\nBu betik TÜM veriyi siler ve geri dönüşü yoktur.');
  console.error('Emin isen: node scripts/wipe.mjs --onayla\n');
  process.exit(1);
}

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
    'npx', ['supabase', 'projects', 'api-keys', '--project-ref', REF, '--output', 'json'],
    { encoding: 'utf8', env, shell: true },
  );
  const list = JSON.parse(out.slice(out.indexOf('[')));
  const k = list.find((x) => x.name === 'service_role');
  if (!k) throw new Error('service_role anahtarı alınamadı');
  return k.api_key;
}
const SR = serviceKey();
const H = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };

async function api(path, init = {}) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, { ...init, headers: { ...H, ...init.headers } });
  const text = await r.text();
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

async function say(tablo) {
  const r = await fetch(`${BASE}/rest/v1/${tablo}?select=*`, {
    headers: { ...H, Prefer: 'count=exact', Range: '0-0' },
  });
  const cr = r.headers.get('content-range') ?? '';
  return Number(cr.split('/')[1] ?? 0);
}

/**
 * Silme SIRASI — yabancı anahtar grafiğinde yapraktan köke.
 *
 * Bir tablo, kendisine işaret eden bütün tablolar boşalmadan silinemez.
 * Sıra bozulursa 23503 (foreign key violation) alınır ve veritabanı yarım
 * silinmiş kalır.
 */
const SIRA = [
  // Yapraklar: yalnız başkalarına işaret ederler
  'ssh_status_logs',
  'order_status_logs',
  'order_item_retail_prices',
  'announcement_reads',
  'staff_scope',
  'login_audit',
  'leads',
  // Ürün bağımlıları
  'retail_prices',
  'retailer_stock',
  'manufacturer_stock',
  'product_costs',
  // İş kayıtları
  'order_items',
  'ssh_requests',
  'return_requests',
  'manual_transaction_requests',
  'finance_entries',
  'transactions',
  'orders',
  'order_sequences',
  // Katalog
  'products',
  'product_groups',
  // Org çevresi
  'announcements',
  'invitations',
  'subscription_requests',
  'relationships',
  // Denetim kayıtları (partition'lar ayrı tablodur)
  'system_logs_202608',
  'system_logs_202609',
  // Kök
  'users',
  'organizations',
];

/** Her satırı eşleyen filtre — PostgREST koşulsuz DELETE kabul etmez. */
const HEPSI = 'id=not.is.null';
/**
 * `id` kolonu OLMAYAN tabloların birincil anahtar kolonu.
 *
 * Değerler şemadan okundu, tahmin edilmedi: `staff_scope` `user_id` değil
 * `staff_user_id`, `order_sequences` `org_id` değil `manufacturer_org_id`
 * taşıyor. Tahminle yazınca ikisi de 42703 verdi.
 */
const ANAHTAR = {
  announcement_reads: 'announcement_id=not.is.null',
  manufacturer_stock: 'owner_org_id=not.is.null',
  order_item_retail_prices: 'order_item_id=not.is.null',
  order_sequences: 'manufacturer_org_id=not.is.null',
  product_costs: 'product_id=not.is.null',
  retail_prices: 'retailer_org_id=not.is.null',
  retailer_stock: 'retailer_org_id=not.is.null',
  staff_scope: 'staff_user_id=not.is.null',
};

console.log('\nSiliniyor...\n');
let toplam = 0;
for (const tablo of SIRA) {
  let once;
  try { once = await say(tablo); } catch { console.log(`  – ${tablo} (yok)`); continue; }
  if (once === 0) { console.log(`  · ${tablo}: zaten boş`); continue; }
  await api(`${tablo}?${ANAHTAR[tablo] ?? HEPSI}`, { method: 'DELETE' });
  const sonra = await say(tablo);
  toplam += once - sonra;
  console.log(`  ${sonra === 0 ? '✓' : '✗'} ${tablo}: ${once} → ${sonra}`);
}

// ─── auth kullanıcıları: platform admini KORUNUR ───────────────────────────
const adminler = await api('platform_admins?select=user_id');
const korunan = new Set(adminler.map((a) => a.user_id));

let sayfa = 1, silinenAuth = 0, kalanAuth = 0;
for (;;) {
  const r = await fetch(`${BASE}/auth/v1/admin/users?page=${sayfa}&per_page=200`, { headers: H });
  const j = await r.json();
  const list = j.users ?? [];
  if (!list.length) break;
  for (const u of list) {
    if (korunan.has(u.id)) { kalanAuth++; continue; }
    await fetch(`${BASE}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: H });
    silinenAuth++;
  }
  if (list.length < 200) break;
  sayfa++;
}
console.log(`  ✓ auth kullanıcıları: ${silinenAuth} silindi, ${kalanAuth} admin korundu`);

console.log(`\nToplam ${toplam} satır silindi. Sistem temiz.\n`);
