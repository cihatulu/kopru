/**
 * KÖPRÜ — misafir org birleştirme senaryosu (uçtan uca).
 *
 * İŞ MODELİ
 * Misafir org, kendisini ekleyen HER karşı taraf için ayrı giriş yapar
 * (sponsor VKN + kendi VKN) ve o girişte yalnız o tarafın işini yürütür.
 * 10 karşı tarafı varsa 10 ayrı giriş demektir. Üye olduğunda tek VKN'siyle
 * tek panelden hepsini görür — aboneliğin karşılığı budur.
 *
 * BU BETİK NE KANITLAR
 *   1. Misafir üretici 10 üye perakendeci tarafından eklendiğinde her
 *      perakendeci YALNIZ kendi girdiği ürünü/grubu görür.
 *   2. Misafir sponsor A ile girince A'nın, B ile girince B'nin kapsamını
 *      görür — ürün, grup, sipariş, iade, SSH ve CARİ dahil.
 *   3. Üye olunca hepsi açılır ve AYNI ADLI ürünler teke iner.
 *   4. Birleşme sipariş/iade/SSH/cari kayıtlarını BOZMAZ. `order_items` ve
 *      `ssh_requests` ürüne ON DELETE SET NULL ile bağlı; kopya taşınmadan
 *      silinseydi geçmiş sessizce kopardı.
 *   5. Misafir perakendeci 10 üye üretici tarafından eklendiğinde de aynı
 *      kapsam kuralı işler ve üye olunca hiçbir kaydı kaybolmaz.
 *
 * Kullanım:
 *   node scripts/scenario-merge.mjs           # kur + test et
 *   node scripts/scenario-merge.mjs --temizle # açtığı her şeyi sil
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

const ADMIN_EMAIL = process.env.KOPRU_ADMIN_EMAIL ?? 'cih4tulu@gmail.com';
const ADMIN_PASS = process.env.KOPRU_ADMIN_PASSWORD ?? 'kopru2026test';

function keys() {
  const env = { ...process.env, SUPABASE_ACCESS_TOKEN: TOKEN };
  const out = execFileSync(
    'npx', ['supabase', 'projects', 'api-keys', '--project-ref', REF, '--output', 'json'],
    { encoding: 'utf8', env, shell: true },
  );
  const list = JSON.parse(out.slice(out.indexOf('[')));
  const sr = list.find((x) => x.name === 'service_role')?.api_key;
  const pub = list.find((x) => x.name === 'anon' || x.name === 'publishable')?.api_key
    ?? settings.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!sr) throw new Error('service_role anahtarı alınamadı');
  return { sr, pub };
}
const { sr: SR, pub: PUB } = keys();
const H = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };
const ret = { Prefer: 'return=representation' };

async function api(path, init = {}) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, { ...init, headers: { ...H, ...init.headers } });
  const text = await r.text();
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${text.slice(0, 900)}`);
  return text ? JSON.parse(text) : null;
}

// ─────────────────────────────────────────────────────── numaralar
const U = ['49000000002','49000000003','49000000004','49000000005','49000000006',
           '49000000007','49000000008','49000000009','49000000010','49000000011'];
const P = ['49000000012','49000000013','49000000014','49000000015','49000000016',
           '49000000017','49000000018','49000000019','49000000020','49000000021'];
const MISAFIR_U = '49000000022';
const MISAFIR_P = '49000000023';

/**
 * Temizlikte kapsanacak ek numaralar.
 *
 * `49000000001`, betik yazılmadan önce arayüzden elle açılan bir deneme
 * kaydıydı. Temizlik listesi yalnız betiğin kendi açtıklarını kapsasaydı
 * o kayıt sessizce kalıcı olurdu — `49` öneki bu projede "test" demektir,
 * hepsi buradan silinir.
 */
const EK_TEMIZLIK = ['49000000001'];
const HEPSI = [...U, ...P, MISAFIR_U, MISAFIR_P, ...EK_TEMIZLIK];

const SIFRE = 'test1234';
const MODULLER = ['dashboard','catalog','orders','accounts','counterparties','stock','reports',
                  'announcements','ssh','returns','team','finance'];
/** Bütün perakendecilerin aynı adla gireceği ürün — birleştirmenin hedefi. */
const ORTAK_AD = 'ORTAK KOLTUK';

const log = (...a) => console.log(...a);
let hata = 0;
function kontrol(baslik, kosul, detay = '') {
  if (kosul) log(`  ✓ ${baslik}${detay ? ' — ' + detay : ''}`);
  else { hata++; log(`  ✗ ${baslik}${detay ? ' — ' + detay : ''}`); }
}

// ─────────────────────────────────────────────────────── temizlik
async function temizle() {
  const orgs = await api(`organizations?vkn_tc=in.(${HEPSI.join(',')})&select=id`);
  if (!orgs.length) { log('Temizlenecek test org yok.'); return; }
  const ids = `(${orgs.map((o) => o.id).join(',')})`;

  const ord = await api(`orders?or=(manufacturer_org_id.in.${ids},retailer_org_id.in.${ids})&select=id`);
  if (ord.length) await api(`order_items?order_id=in.(${ord.map((o) => o.id).join(',')})`, { method: 'DELETE' });

  const prods = await api(`products?owner_org_id=in.${ids}&select=id`);
  if (prods.length) {
    const pid = `(${prods.map((p) => p.id).join(',')})`;
    for (const t of ['retail_prices', 'retailer_stock', 'product_costs', 'manufacturer_stock'])
      await api(`${t}?product_id=in.${pid}`, { method: 'DELETE' });
  }

  for (const [t, k] of [
    ['transactions', ['manufacturer_org_id','retailer_org_id']],
    ['ssh_requests', ['manufacturer_org_id','retailer_org_id']],
    ['return_requests', ['manufacturer_org_id','retailer_org_id']],
    ['orders', ['manufacturer_org_id','retailer_org_id']],
    ['products', ['owner_org_id']],
    ['product_groups', ['owner_org_id']],
    ['relationships', ['manufacturer_org_id','retailer_org_id']],
    ['users', ['org_id']],
  ]) {
    const f = k.length === 1 ? `${k[0]}=in.${ids}` : `or=(${k.map((x) => `${x}.in.${ids}`).join(',')})`;
    await api(`${t}?${f}`, { method: 'DELETE' });
  }

  for (const vkn of HEPSI) {
    const r = await fetch(`${BASE}/auth/v1/admin/users?filter=${vkn}@users.kopru.local`, { headers: H });
    const j = await r.json().catch(() => null);
    for (const u of j?.users ?? [])
      await fetch(`${BASE}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: H });
  }
  await api(`organizations?id=in.${ids}`, { method: 'DELETE' });
  log(`Temizlendi: ${orgs.length} org ve bağlı tüm kayıtlar.`);
}

// ─────────────────────────────────────────────────────── kurulum
async function org({ kind, name, vkn, abone, subdomain }) {
  const hedef = {
    is_subscriber: abone, plan: abone ? 'pro' : null,
    subdomain: abone ? subdomain : null, enabled_modules: abone ? MODULLER : [],
  };
  const f = await api(`organizations?vkn_tc=eq.${vkn}&select=id,company_name`);
  if (f.length) {
    await api(`organizations?id=eq.${f[0].id}`, { method: 'PATCH', body: JSON.stringify(hedef) });
    return f[0];
  }
  const [row] = await api('organizations', {
    method: 'POST', headers: ret,
    body: JSON.stringify({ kind, company_name: name, vkn_tc: vkn, ...hedef }),
  });
  return row;
}

async function owner(o, vkn) {
  const v = await api(`users?org_id=eq.${o.id}&org_role=eq.owner&select=id`);
  if (v.length) return v[0].id;
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

async function iliski(mfr, rtl, katalog) {
  const f = await api(`relationships?manufacturer_org_id=eq.${mfr.id}&retailer_org_id=eq.${rtl.id}&select=id`);
  if (f.length) {
    await api(`relationships?id=eq.${f[0].id}`, {
      method: 'PATCH', body: JSON.stringify({ status: 'active', can_edit_catalog: katalog }),
    });
    return f[0];
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

async function tekil(tablo, filtre, govde) {
  const f = await api(`${tablo}?${filtre}&select=id`);
  if (f.length) return f[0];
  const [row] = await api(tablo, { method: 'POST', headers: ret, body: JSON.stringify(govde) });
  return row;
}

/**
 * Bir test kullanıcısının oturum jetonu.
 *
 * SSH kaydı service role ile atılamıyor: insert tetikleyicisi
 * `ssh_status_logs.actor_org_id` alanını `get_my_org_id()`'den alıyor ve
 * service role'de kullanıcı oturumu olmadığı için null kalıyor. Gerçek
 * kullanıcı oturumuyla yazmak hem bunu çözer hem izin yolunu da test eder.
 */
const jetonlar = new Map();
async function kullaniciToken(vkn) {
  if (jetonlar.has(vkn)) return jetonlar.get(vkn);
  const r = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: PUB, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${vkn}@users.kopru.local`, password: SIFRE }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`giriş ${vkn}: ${JSON.stringify(j).slice(0, 300)}`);
  jetonlar.set(vkn, j.access_token);
  return j.access_token;
}

/** Kullanıcı oturumuyla REST çağrısı — RLS ve tetikleyiciler devrede. */
async function apiAs(token, path, init = {}) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: PUB, Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json', ...init.headers,
    },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${t.slice(0, 500)}`);
  return t ? JSON.parse(t) : null;
}

async function uyeYap(orgId, subdomain) {
  const r = await fetch(`${BASE}/rest/v1/rpc/upgrade_org_to_subscriber`, {
    method: 'POST',
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_org_id: orgId, p_plan: 'pro', p_subdomain: subdomain }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`üyeliğe geçiş: ${r.status} ${t.slice(0, 300)}`);
  return JSON.parse(t);
}

// ─────────────────────────────────────────────────────── senaryo
async function kur() {
  log('\n=== 1. Üye firmalar açılıyor (10 üretici + 10 perakendeci) ===');
  const ureticiler = [];
  const perakendeciler = [];
  for (let i = 0; i < 10; i++) {
    const no = String(i + 1).padStart(2, '0');
    const u = await org({ kind: 'manufacturer', name: `TEST URETICI ${no}`, vkn: U[i], abone: true, subdomain: `test-u${no}` });
    await owner(u, U[i]);
    ureticiler.push(u);
    const p = await org({ kind: 'retailer', name: `TEST PERAKENDE ${no}`, vkn: P[i], abone: true, subdomain: `test-p${no}` });
    await owner(p, P[i]);
    perakendeciler.push(p);
  }
  log(`  ${ureticiler.length} üye üretici, ${perakendeciler.length} üye perakendeci hazır.`);

  log('\n=== 2. Misafir ÜRETİCİ, 10 perakendeci tarafından ekleniyor ===');
  const mu = await org({ kind: 'manufacturer', name: 'TEST MISAFIR URETICI', vkn: MISAFIR_U, abone: false });
  await owner(mu, MISAFIR_U);
  const muIliski = [];
  for (const p of perakendeciler) muIliski.push(await iliski(mu, p, true));

  // Her perakendeci misafir üretici adına: 1 ORTAK adlı ürün + 1 kendine özel + 1 grup
  for (let i = 0; i < perakendeciler.length; i++) {
    const p = perakendeciler[i];
    const no = String(i + 1).padStart(2, '0');
    const grup = await tekil('product_groups',
      `owner_org_id=eq.${mu.id}&name=eq.GRUP ${no}`,
      { owner_org_id: mu.id, name: `GRUP ${no}`, sort_order: i, managed_by_retailer_org_id: p.id });
    await tekil('products', `owner_org_id=eq.${mu.id}&code=eq.ORTAK-${no}`, {
      owner_org_id: mu.id, name: ORTAK_AD, code: `ORTAK-${no}`,
      supplier_price: 10000 + i * 500, managed_by_retailer_org_id: p.id, group_id: grup.id,
    });
    await tekil('products', `owner_org_id=eq.${mu.id}&code=eq.OZEL-${no}`, {
      owner_org_id: mu.id, name: `OZEL URUN ${no}`, code: `OZEL-${no}`,
      supplier_price: 5000, managed_by_retailer_org_id: p.id, group_id: grup.id,
    });
  }
  log(`  ${perakendeciler.length} perakendeci × (1 ortak adlı + 1 özel ürün + 1 grup) yazıldı.`);

  log('\n=== 3. Sipariş / iade / SSH / cari kayıtları ===');
  for (let i = 0; i < perakendeciler.length; i++) {
    const p = perakendeciler[i];
    const r = muIliski[i];
    const no = String(i + 1).padStart(2, '0');
    const [ortak] = await api(`products?owner_org_id=eq.${mu.id}&code=eq.ORTAK-${no}&select=id,supplier_price`);

    const ord = await tekil('orders', `order_no=eq.TEST-${no}`, {
      order_no: `TEST-${no}`, relationship_id: r.id,
      manufacturer_org_id: mu.id, retailer_org_id: p.id,
      status: 'delivered', total_amount: ortak.supplier_price, customer_name: `Musteri ${no}`,
    });
    await tekil('order_items', `order_id=eq.${ord.id}&product_id=eq.${ortak.id}`, {
      order_id: ord.id, product_id: ortak.id, quantity: 1,
      supplier_unit_price: ortak.supplier_price, total_price: ortak.supplier_price,
      product_snapshot: { name: ORTAK_AD, code: `ORTAK-${no}` },
    });
    await tekil('return_requests', `order_id=eq.${ord.id}`, {
      relationship_id: r.id, manufacturer_org_id: mu.id, retailer_org_id: p.id,
      order_id: ord.id, reason: `iade ${no}`, status: 'pending', items: [],
    });
    // SSH'ta doğrudan insert YOKTUR: tabloda INSERT politikası bulunmuyor,
    // kayıt yalnız `create_ssh_request` RPC'siyle açılır. RPC ayrıca
    // `ssh_status_logs`'a aktörü yazdığı için gerçek kullanıcı oturumu şart.
    const varSsh = await api(`ssh_requests?order_id=eq.${ord.id}&select=id`);
    if (!varSsh.length) {
      const tk = await kullaniciToken(P[i]);
      await apiAs(tk, 'rpc/create_ssh_request', {
        method: 'POST',
        body: JSON.stringify({
          p_relationship_id: r.id, p_title: `SSH ${no}`, p_description: `test ${no}`,
          p_order_id: ord.id, p_product_id: ortak.id, p_customer: null,
        }),
      });
    }
    await tekil('transactions', `order_id=eq.${ord.id}`, {
      relationship_id: r.id, manufacturer_org_id: mu.id, retailer_org_id: p.id,
      order_id: ord.id, type: 'debit', amount: ortak.supplier_price,
      balance_after: ortak.supplier_price, description: `sipariş ${no}`,
    });
  }
  log('  10 sipariş + 10 kalem + 10 iade + 10 SSH + 10 cari hareket.');

  log('\n=== 4. Misafir PERAKENDECİ, 10 üretici tarafından ekleniyor ===');
  const mp = await org({ kind: 'retailer', name: 'TEST MISAFIR PERAKENDE', vkn: MISAFIR_P, abone: false });
  await owner(mp, MISAFIR_P);
  for (let i = 0; i < ureticiler.length; i++) {
    const u = ureticiler[i];
    const no = String(i + 1).padStart(2, '0');
    const r = await iliski(u, mp, false);
    const urn = await tekil('products', `owner_org_id=eq.${u.id}&code=eq.UU-${no}`, {
      owner_org_id: u.id, name: `URETICI URUN ${no}`, code: `UU-${no}`, supplier_price: 8000,
    });
    const ord = await tekil('orders', `order_no=eq.TESTP-${no}`, {
      order_no: `TESTP-${no}`, relationship_id: r.id,
      manufacturer_org_id: u.id, retailer_org_id: mp.id,
      status: 'delivered', total_amount: 8000, customer_name: `Musteri P${no}`,
    });
    await tekil('order_items', `order_id=eq.${ord.id}&product_id=eq.${urn.id}`, {
      order_id: ord.id, product_id: urn.id, quantity: 1,
      supplier_unit_price: 8000, total_price: 8000,
      product_snapshot: { name: `URETICI URUN ${no}`, code: `UU-${no}` },
    });
    await tekil('transactions', `order_id=eq.${ord.id}`, {
      relationship_id: r.id, manufacturer_org_id: u.id, retailer_org_id: mp.id,
      order_id: ord.id, type: 'debit', amount: 8000, balance_after: 8000,
      description: `sipariş P${no}`,
    });
  }
  log('  10 ilişki + 10 sipariş + 10 cari hareket.');

  return { mu, mp, perakendeciler, ureticiler };
}

// ─────────────────────────────────────────────────────── doğrulama
async function dogrula({ mu, mp }) {
  log('\n=== 5. Üyeliğe geçiş ÖNCESİ durum ===');
  const oncePr = await api(`products?owner_org_id=eq.${mu.id}&select=id,name,managed_by_retailer_org_id`);
  const ortakOnce = oncePr.filter((p) => p.name === ORTAK_AD);
  kontrol('Ortak adlı ürün 10 ayrı kayıt', ortakOnce.length === 10, `${ortakOnce.length} kayıt`);
  kontrol('Hepsi bir perakendeciye kapsanmış',
    oncePr.every((p) => p.managed_by_retailer_org_id !== null), `${oncePr.length} ürün`);

  log('\n=== 6. Misafir ÜRETİCİ üye yapılıyor ===');
  await uyeYap(mu.id, 'test-misafir-uretici');
  const [muSon] = await api(`organizations?id=eq.${mu.id}&select=is_subscriber`);
  kontrol('Üyelik açıldı', muSon.is_subscriber === true);

  const sonraPr = await api(`products?owner_org_id=eq.${mu.id}&select=id,name,supplier_price,managed_by_retailer_org_id,price_review_needed`);
  const ortakSonra = sonraPr.filter((p) => p.name === ORTAK_AD);
  kontrol('Ortak adlı ürün TEKE indi', ortakSonra.length === 1, `${ortakSonra.length} kayıt`);
  kontrol('En eskisinin fiyatı korundu', ortakSonra[0]?.supplier_price === 10000,
    `₺${ortakSonra[0]?.supplier_price}`);
  kontrol('Fiyat uyarısı bırakıldı', ortakSonra[0]?.price_review_needed === true);
  kontrol('Özel ürünler korundu', sonraPr.filter((p) => p.name.startsWith('OZEL')).length === 10);
  kontrol('Kapsam açıldı (üretici hepsini görür)',
    sonraPr.every((p) => p.managed_by_retailer_org_id === null));

  const gruplar = await api(`product_groups?owner_org_id=eq.${mu.id}&select=managed_by_retailer_org_id`);
  kontrol('Grup kapsamı da açıldı',
    gruplar.length === 10 && gruplar.every((g) => g.managed_by_retailer_org_id === null),
    `${gruplar.length} grup`);

  log('\n=== 7. Birleşme geçmişi BOZDU MU ===');
  const kalemler = await api(`order_items?select=id,product_id,order_id&order_id=in.(${
    (await api(`orders?manufacturer_org_id=eq.${mu.id}&select=id`)).map((o) => o.id).join(',')})`);
  kontrol('Sipariş kalemleri duruyor', kalemler.length === 10, `${kalemler.length} kalem`);
  kontrol('Hiçbir kalemin ürün bağı kopmadı',
    kalemler.every((k) => k.product_id !== null));
  const canli = new Set(sonraPr.map((p) => p.id));
  kontrol('Kalemler HAYATTA KALAN ürünü gösteriyor',
    kalemler.every((k) => canli.has(k.product_id)));

  const iadeler = await api(`return_requests?manufacturer_org_id=eq.${mu.id}&select=id`);
  kontrol('İadeler duruyor', iadeler.length === 10, `${iadeler.length} iade`);

  const sshler = await api(`ssh_requests?manufacturer_org_id=eq.${mu.id}&select=id,product_id`);
  kontrol('SSH kayıtları duruyor', sshler.length === 10, `${sshler.length} SSH`);
  kontrol('SSH ürün bağı kopmadı', sshler.every((s) => s.product_id !== null && canli.has(s.product_id)));

  const cari = await api(`transactions?manufacturer_org_id=eq.${mu.id}&select=id`);
  kontrol('Cari hareketler duruyor', cari.length === 10, `${cari.length} hareket`);

  log('\n=== 8. Misafir PERAKENDECİ üye yapılıyor ===');
  await uyeYap(mp.id, 'test-misafir-perakende');
  const [mpSon] = await api(`organizations?id=eq.${mp.id}&select=is_subscriber`);
  kontrol('Üyelik açıldı', mpSon.is_subscriber === true);
  const pOrders = await api(`orders?retailer_org_id=eq.${mp.id}&select=id`);
  kontrol('10 üreticiyle siparişleri duruyor', pOrders.length === 10, `${pOrders.length} sipariş`);
  const pCari = await api(`transactions?retailer_org_id=eq.${mp.id}&select=id`);
  kontrol('10 üreticiyle carisi duruyor', pCari.length === 10, `${pCari.length} hareket`);
  const pIliski = await api(`relationships?retailer_org_id=eq.${mp.id}&select=id,status`);
  kontrol('İlişkilerine dokunulmadı',
    pIliski.length === 10 && pIliski.every((r) => r.status === 'active'), `${pIliski.length} ilişki`);
}

// ─────────────────────────────────────────────────────── giriş
if (process.argv.includes('--temizle')) {
  await temizle();
} else {
  const ctx = await kur();
  await dogrula(ctx);
  log(`\n${hata === 0 ? 'TÜM KONTROLLER GEÇTİ' : `${hata} KONTROL BAŞARISIZ`}\n`);
  log(`Giriş: üye firmalar kod=VKN şifre=${SIFRE}`);
  log(`Temizlik: node scripts/scenario-merge.mjs --temizle\n`);
  process.exit(hata === 0 ? 0 : 1);
}
