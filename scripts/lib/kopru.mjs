/**
 * KÖPRÜ — doğrulama betikleri için ortak taşıma katmanı.
 *
 * NEDEN AYRI DOSYA
 * `scenario-full.mjs` üç ayrı kimlik türüyle (service role, üye oturumu,
 * misafir oturumu) ve dört ayrı uçla (REST, RPC, Edge Function, Auth admin)
 * konuşuyor. Bunları senaryonun içine karıştırmak, senaryoyu okunmaz yapar;
 * ayrıca ileride başka senaryolar da aynı kimlik mantığını kullanacak.
 *
 * KİMLİK KURALI — betiğin en kritik kısıtı
 * Yazma işlemleri service role ile YAPILMAZ. Service role'de `auth.uid()` ve
 * `get_my_org_id()` NULL döner; üç değerli mantık yüzünden birçok RPC'nin
 * yetki koşulu sessizce geçer ve aktör NULL yazılır. O yolla yapılan test,
 * test etmesi gereken şeyi atlar. Service role burada YALNIZ iki iş için
 * kullanılır: (a) kurulum (org/kullanıcı açma — bunların RPC'si yok),
 * (b) doğrulama okumaları (RLS'i bypass ederek gerçeği görmek).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const settings = JSON.parse(readFileSync('.claude/settings.local.json', 'utf8'));
export const REF = settings.env.SUPABASE_PROJECT_REF;
const TOKEN = settings.env.SUPABASE_ACCESS_TOKEN;
if (!REF || !TOKEN) {
  console.error('.claude/settings.local.json içinde SUPABASE_PROJECT_REF ve SUPABASE_ACCESS_TOKEN gerekli.');
  process.exit(1);
}
export const BASE = `https://${REF}.supabase.co`;

function anahtarlar() {
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
export const { sr: SR, pub: PUB } = anahtarlar();

const SR_H = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };
export const DONDUR = { Prefer: 'return=representation' };

/** Service role ile REST — RLS kapalı, gerçeği görür. Yalnız kurulum ve denetim. */
export async function api(path, init = {}) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, { ...init, headers: { ...SR_H, ...init.headers } });
  const t = await r.text();
  if (!r.ok) throw new Error(`SR ${path} -> ${r.status} ${t.slice(0, 600)}`);
  return t ? JSON.parse(t) : null;
}

/** Kullanıcı oturumuyla REST — RLS, tetikleyiciler ve `auth.uid()` devrede. */
export async function apiAs(token, path, init = {}) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: PUB, Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json', ...init.headers,
    },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${path} :: ${t.slice(0, 400)}`);
  return t ? JSON.parse(t) : null;
}

/**
 * Kullanıcı oturumuyla RPC.
 *
 * Hata FIRLATMAZ, `{ ok, veri, durum, mesaj }` döner. Sebep: bu betiğin
 * işinin yarısı "bu çağrı reddedilmeli miydi" sorusunu ölçmek. Reddi
 * istisnayla yönetmek her kontrolü try/catch'e boğardı.
 */
export async function rpc(token, ad, arglar = {}) {
  const r = await fetch(`${BASE}/rest/v1/rpc/${ad}`, {
    method: 'POST',
    headers: token
      ? { apikey: PUB, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { apikey: PUB, 'Content-Type': 'application/json' },
    body: JSON.stringify(arglar),
  });
  const t = await r.text();
  let veri = null;
  try { veri = t ? JSON.parse(t) : null; } catch { veri = t; }
  return { ok: r.ok, durum: r.status, veri, mesaj: r.ok ? '' : String(t).slice(0, 300) };
}

/** Service role ile RPC — yalnız denetim okumaları için. */
export async function rpcSR(ad, arglar = {}) {
  const r = await fetch(`${BASE}/rest/v1/rpc/${ad}`, {
    method: 'POST', headers: SR_H, body: JSON.stringify(arglar),
  });
  const t = await r.text();
  let veri = null;
  try { veri = t ? JSON.parse(t) : null; } catch { veri = t; }
  return { ok: r.ok, durum: r.status, veri, mesaj: r.ok ? '' : String(t).slice(0, 300) };
}

/** Satır sayısı — `count=exact` başlığıyla, veriyi çekmeden. */
export async function say(path) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, {
    headers: { ...SR_H, Prefer: 'count=exact', Range: '0-0' },
  });
  return Number((r.headers.get('content-range') ?? '').split('/')[1] ?? 0);
}

// ─────────────────────────────────────────────────────────── oturumlar

const uyeJeton = new Map();

/**
 * ÜYE (abone) org sahibinin oturumu — gerçek `login` Edge Function'ından.
 *
 * `signInWithPassword` doğrudan çağrılabilirdi ama o yol `app_metadata`daki
 * `sponsor_org_id` claim'ini temizlemez. Aynı auth kullanıcısı daha önce
 * misafir olarak giriş yaptıysa jetonda bayat bir sponsor kalır ve org
 * kendi verisinin yalnız bir dilimini görür. Edge Function bunu temizliyor.
 */
export async function uyeGiris(portal, vkn, sifre) {
  const k = `u:${portal}:${vkn}`;
  if (uyeJeton.has(k)) return uyeJeton.get(k);
  const t = await girisEF({ portal, mode: 'subscriber', userCode: vkn, password: sifre, userType: 'owner' });
  uyeJeton.set(k, t);
  return t;
}

/**
 * MİSAFİR org oturumu — sponsor VKN + kendi VKN + şifre.
 *
 * ÖNBELLEKLENMEZ ve seri çağrılmalıdır. Edge Function her başarılı girişte
 * `app_metadata.sponsor_org_id` alanının ÜZERİNE yazıyor; alan tekildir.
 * Aynı misafir için iki sponsorla eşzamanlı giriş yapılırsa ikinci giriş
 * birincinin jetonunu geçersiz kılmaz ama sıradaki `refreshSession` yanlış
 * sponsoru taşıyabilir. Bu yarış senaryonun kendisi tarafından tetiklenirse
 * bulgular güvenilmez olur.
 */
export async function misafirGiris(portal, sponsorVkn, vkn, sifre) {
  return girisEF({ portal, mode: 'guest', userCode: vkn, sponsorVkn, password: sifre, userType: 'owner' });
}

/** Personel (staff/accountant) girişi — org VKN'si + personelin kendi şifresi. */
export async function personelGiris(portal, orgVkn, sifre, mod = 'subscriber') {
  return girisEF({ portal, mode: mod, userCode: orgVkn, password: sifre, userType: 'staff' });
}

export async function adminGiris(email, sifre) {
  return girisEF({ portal: 'admin', email, password: sifre });
}

async function girisEF(govde) {
  const r = await fetch(`${BASE}/functions/v1/login`, {
    method: 'POST',
    headers: { apikey: PUB, Authorization: `Bearer ${PUB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(govde),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    throw new Error(`giriş [${govde.userCode ?? govde.email}] -> ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  }
  return j.access_token;
}

// ─────────────────────────────────────────────────────────── akış kontrolü

/**
 * Sınırlı eşzamanlılıkla işleme.
 *
 * 300 org ve binlerce çağrı seri koşarsa dakikalar sürer; sınırsız
 * `Promise.all` ise PostgREST bağlantı havuzunu tüketip 503 verir.
 * `order_sequences` satır kilidi zaten üretici başına serileştiriyor,
 * bu yüzden eşzamanlılığın faydası da bir yerde doyuma ulaşıyor.
 */
export async function kova(liste, genislik, isle) {
  const sonuc = new Array(liste.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(genislik, liste.length) }, async () => {
      for (;;) {
        const k = i++;
        if (k >= liste.length) return;
        sonuc[k] = await isle(liste[k], k);
      }
    }),
  );
  return sonuc;
}

// ─────────────────────────────────────────────────────────── raporlama

export const bulgular = [];
let gecen = 0, kalan = 0;

export const log = (...a) => console.log(...a);

export function kontrol(baslik, kosul, detay = '') {
  if (kosul) { gecen++; log(`  ✓ ${baslik}${detay ? ' — ' + detay : ''}`); }
  else { kalan++; log(`  ✗ ${baslik}${detay ? ' — ' + detay : ''}`); }
  return kosul;
}

/**
 * Bir kusur envanteri maddesinin sonucu.
 *
 * `sonuc`: 'kanitlandi' | 'curutuldu' | 'test-edilemedi'
 * "Kanıtlandı" burada iyi bir şey değil — kusurun canlıda gerçekten
 * oluştuğu anlamına gelir.
 */
export function bulgu(kod, baslik, sonuc, kanit) {
  bulgular.push({ kod, baslik, sonuc, kanit });
  const im = sonuc === 'kanitlandi' ? '!' : sonuc === 'curutuldu' ? '✓' : '?';
  log(`  [${im}] ${kod} ${baslik} — ${sonuc}${kanit ? ': ' + kanit : ''}`);
}

export const sayac = () => ({ gecen, kalan });
