/**
 * KÖPRÜ — doğrulama koşusu, Faz A ve B: ekosistemin kurulması.
 *
 * FAZ A (service role): 50 üye üretici + 50 üye perakendeci ve owner
 * kullanıcıları. Org ve auth kullanıcısı açmanın kullanıcı-yüzlü bir RPC'si
 * yok — platform admini yapar. Bu yüzden burada service role meşru.
 *
 * FAZ B (gerçek oturum): misafirler `add_counterparty` ile AÇILIR. Bunları
 * da service role ile INSERT etmek kolay olurdu ama o zaman VKN yakınsaması
 * (A3), ilişki durumu kuralı ve `leads` tetikleyicisi hiç çalışmazdı —
 * yani test edilecek şeyin kendisi atlanırdı.
 *
 * BİRLEŞTİRME MALZEMESİ
 * Her misafir ÜÇ farklı üye tarafından ekleniyor. Üç ayrı kenar, tek org
 * (A3 yakınsaması). Üyeliğe geçişte bu üç kenarın kataloğu birleşecek.
 */
import { api, apiAs, rpc, DONDUR, kova, log, kontrol, BASE, PUB, SR } from './kopru.mjs';

export const SIFRE = 'test1234';
export const ONEK = '48';

/** Test VKN'leri: `48` öneki bu koşunun imzası; temizlik bu önekle çalışır. */
export const vknUyeUretici = (i) => `4800${String(i).padStart(6, '0')}`;
export const vknUyePerakende = (i) => `4810${String(i).padStart(6, '0')}`;
export const vknMisafirUretici = (i) => `4820${String(i).padStart(6, '0')}`;
export const vknMisafirPerakende = (i) => `4830${String(i).padStart(6, '0')}`;

const MODULLER = ['dashboard', 'catalog', 'orders', 'accounts', 'counterparties', 'stock',
                  'reports', 'announcements', 'ssh', 'returns', 'team', 'finance'];

/** Kaç misafirin kaç üyeye bağlanacağı — birleştirmenin girdisi. */
export const SPONSOR_SAYISI = 3;

// ─────────────────────────────────────────────────────────── temel yazımlar

async function orgAc({ kind, name, vkn, abone, subdomain }) {
  const hedef = {
    is_subscriber: abone,
    plan: abone ? 'pro' : null,
    subdomain: abone ? subdomain : null,
    enabled_modules: abone ? MODULLER : [],
  };
  const v = await api(`organizations?vkn_tc=eq.${vkn}&select=id,company_name,kind,is_subscriber`);
  if (v.length) {
    await api(`organizations?id=eq.${v[0].id}`, { method: 'PATCH', body: JSON.stringify(hedef) });
    return { ...v[0], ...hedef, vkn };
  }
  const [row] = await api('organizations', {
    method: 'POST', headers: DONDUR,
    body: JSON.stringify({ kind, company_name: name, vkn_tc: vkn, ...hedef }),
  });
  return { ...row, vkn };
}

/**
 * Bir org'a giriş yapabilen kullanıcı açar.
 *
 * `user_code` şemada `^[a-z0-9]{3,32}$` ile kısıtlı: owner için VKN, personel
 * için VKN'den türetilmiş küçük harfli bir kod. Büyük harf veya tire
 * kullanmak 23514 verir.
 */
export async function kullaniciAc(orgId, kod, rol, adSoyad) {
  const v = await api(`users?user_code=eq.${kod}&select=id`);
  if (v.length) return v[0].id;
  const email = `${kod}@users.kopru.local`;
  const r = await fetch(`${BASE}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: SIFRE, email_confirm: true }),
  });
  const au = await r.json();
  if (!r.ok) throw new Error(`auth kullanıcı ${kod}: ${JSON.stringify(au).slice(0, 200)}`);
  await api('users', {
    method: 'POST',
    body: JSON.stringify({
      id: au.id, org_id: orgId, org_role: rol, user_code: kod,
      auth_email: email, full_name: adSoyad,
    }),
  });
  return au.id;
}

// ─────────────────────────────────────────────────────────── Faz A

export async function fazA(uyeSayisi) {
  log(`\n=== FAZ A — ${uyeSayisi} üye üretici + ${uyeSayisi} üye perakendeci ===`);
  const dizin = Array.from({ length: uyeSayisi }, (_, i) => i + 1);

  const ureticiler = await kova(dizin, 8, async (i) => {
    const vkn = vknUyeUretici(i);
    const o = await orgAc({
      kind: 'manufacturer', name: `UYE URETICI ${String(i).padStart(3, '0')}`,
      vkn, abone: true, subdomain: `t-uu-${i}`,
    });
    await kullaniciAc(o.id, vkn, 'owner', `Uretici ${i} Yetkili`);
    return o;
  });

  const perakendeciler = await kova(dizin, 8, async (i) => {
    const vkn = vknUyePerakende(i);
    const o = await orgAc({
      kind: 'retailer', name: `UYE PERAKENDE ${String(i).padStart(3, '0')}`,
      vkn, abone: true, subdomain: `t-up-${i}`,
    });
    await kullaniciAc(o.id, vkn, 'owner', `Perakende ${i} Yetkili`);
    return o;
  });

  /*
    PERSONEL — K19 ve K21'in tetikleyicisi.

    `login` Edge Function'ı personel girişinde org'un TÜM personelini sırayla
    bcrypt ile deniyor; eşleşmeyenlerin `failed_attempts` sayacını artırıyor.
    Tek personelle bu görünmez. Üç personel açıp sonuncusunun şifresiyle
    giriş yapınca ilk ikisinin sayacı artmalı — ölçeceğimiz şey bu.

    `accountant` ise `staff_scope` izolasyonunun dışında; ilk üç üye
    perakendeciye birer muhasebeci koyup ne gördüğüne bakacağız.
  */
  const personelli = perakendeciler.slice(0, 3);
  for (const p of personelli) {
    for (const [sira, rol] of [[1, 'staff'], [2, 'staff'], [3, 'accountant']]) {
      await kullaniciAc(p.id, `s${p.vkn}x${sira}`, rol, `${rol} ${sira}`);
    }
  }
  const ureticiPersonelli = ureticiler.slice(0, 3);
  for (const u of ureticiPersonelli) {
    for (const [sira, rol] of [[1, 'staff'], [2, 'staff'], [3, 'accountant']]) {
      await kullaniciAc(u.id, `s${u.vkn}x${sira}`, rol, `${rol} ${sira}`);
    }
  }

  log(`  ${ureticiler.length} üretici, ${perakendeciler.length} perakendeci, ` +
      `${(personelli.length + ureticiPersonelli.length) * 3} personel açıldı.`);
  return { ureticiler, perakendeciler };
}

// ─────────────────────────────────────────────────────────── Faz B

/**
 * `add_counterparty` ile karşı taraf ekler.
 *
 * Dönüş `add_counterparty_result` bileşik tipi: PostgREST bunu tek elemanlı
 * dizi olarak değil, düz nesne olarak verir.
 */
async function karsiTarafEkle(token, vkn, ad) {
  const r = await rpc(token, 'add_counterparty', {
    p_vkn_tc: vkn, p_company_name: ad, p_discount_rate: 0,
  });
  if (!r.ok) throw new Error(`add_counterparty ${vkn}: ${r.mesaj}`);
  return Array.isArray(r.veri) ? r.veri[0] : r.veri;
}

export async function fazB(ctx, misafirSayisi, jetonUye) {
  const { ureticiler, perakendeciler } = ctx;
  log(`\n=== FAZ B — ${misafirSayisi} misafir üretici + ${misafirSayisi} misafir perakendeci ===`);
  log(`  Her misafir ${SPONSOR_SAYISI} ayrı üye tarafından eklenecek.`);

  const dizin = Array.from({ length: misafirSayisi }, (_, i) => i + 1);

  // ── Misafir ÜRETİCİLER: üye perakendeciler ekler
  const misafirUreticiler = await kova(dizin, 6, async (i) => {
    const vkn = vknMisafirUretici(i);
    const ad = `MISAFIR URETICI ${String(i).padStart(3, '0')}`;
    const sponsorlar = [];
    for (let s = 0; s < SPONSOR_SAYISI; s++) {
      const p = perakendeciler[(i + s * 7) % perakendeciler.length];
      const sonuc = await karsiTarafEkle(await jetonUye(p), vkn, ad);
      sponsorlar.push({ org: p, relationshipId: sonuc.relationship_id, durum: sonuc.status });
    }
    return { vkn, ad, id: sponsorlar[0] ? null : null, sponsorlar };
  });

  // ── Misafir PERAKENDECİLER: üye üreticiler ekler
  const misafirPerakendeciler = await kova(dizin, 6, async (i) => {
    const vkn = vknMisafirPerakende(i);
    const ad = `MISAFIR PERAKENDE ${String(i).padStart(3, '0')}`;
    const sponsorlar = [];
    for (let s = 0; s < SPONSOR_SAYISI; s++) {
      const u = ureticiler[(i + s * 7) % ureticiler.length];
      const sonuc = await karsiTarafEkle(await jetonUye(u), vkn, ad);
      sponsorlar.push({ org: u, relationshipId: sonuc.relationship_id, durum: sonuc.status });
    }
    return { vkn, ad, sponsorlar };
  });

  // Org kimliklerini ve owner kullanıcılarını tamamla.
  for (const liste of [misafirUreticiler, misafirPerakendeciler]) {
    for (const m of liste) {
      const [o] = await api(`organizations?vkn_tc=eq.${m.vkn}&select=id,kind,is_subscriber`);
      if (!o) throw new Error(`misafir org açılmamış: ${m.vkn}`);
      m.id = o.id;
      m.kind = o.kind;
      await kullaniciAc(o.id, m.vkn, 'owner', `${m.ad} Yetkili`);
    }
  }

  /*
    A3 YAKINSAMASI — bu koşunun kanıtlaması gereken ilk şey.
    Üç ayrı üye aynı VKN'yi ekledi. Sonuç ÜÇ org değil, üç KENAR olmalı.
  */
  const tekilU = new Set(misafirUreticiler.map((m) => m.id));
  kontrol('A3: aynı VKN tek org\'a yakınsadı (misafir üretici)',
    tekilU.size === misafirUreticiler.length, `${tekilU.size} org / ${misafirUreticiler.length} VKN`);
  const kenar = misafirUreticiler.reduce((t, m) => t + m.sponsorlar.length, 0);
  kontrol('Her misafire 3 ayrı kenar açıldı',
    kenar === misafirUreticiler.length * SPONSOR_SAYISI, `${kenar} ilişki`);

  /*
    İLİŞKİ DURUMU (PLAN §5 · bugün geri getirilen kural)
    Karşı taraf ÜYE ise onay bekler ('pending'), MİSAFİR ise doğrudan
    'active' olur — misafirin onaylayacak bir paneli yok.
  */
  const misafirDurumlari = misafirUreticiler.flatMap((m) => m.sponsorlar.map((s) => s.durum));
  kontrol('Misafir ekleme onaysız aktifleşiyor',
    misafirDurumlari.every((d) => d === 'active'),
    `${misafirDurumlari.filter((d) => d === 'active').length}/${misafirDurumlari.length} active`);

  // ── Katalog izni: her misafir üreticinin her sponsoruna açılır.
  let izin = 0;
  for (const m of misafirUreticiler) {
    for (const s of m.sponsorlar) {
      const r = await rpc(await jetonUye(s.org), 'set_catalog_permission', {
        p_relationship_id: s.relationshipId, p_can_edit: true,
      });
      if (r.ok) izin++;
    }
  }
  kontrol('Katalog izni açıldı', izin === kenar, `${izin}/${kenar}`);

  log(`  ${misafirUreticiler.length} misafir üretici, ${misafirPerakendeciler.length} misafir perakendeci.`);
  return { misafirUreticiler, misafirPerakendeciler };
}

/**
 * Üye ↔ üye ilişkileri — onay akışının gerçek testi.
 *
 * Karşı taraf abone olduğu için `add_counterparty` 'pending' döner ve
 * ilişki, karşı taraf `respond_to_connection_request` çağırana kadar
 * çalışmaz. Bugün düzeltilen 42804 hatası tam burada saklıydı: onay
 * düğmesi hiç çalışmıyordu ama pending yolu fiilen kapalı olduğu için
 * kimse fark etmemişti.
 */
export async function uyeUyeIliskileri(ctx, jetonUye, adet) {
  const { ureticiler, perakendeciler } = ctx;
  log(`\n=== FAZ B2 — üye ↔ üye ilişkileri (onay akışı) ===`);
  const ciftler = Array.from({ length: adet }, (_, i) => ({
    u: ureticiler[i % ureticiler.length],
    p: perakendeciler[i % perakendeciler.length],
  }));

  const sonuc = await kova(ciftler, 6, async ({ u, p }) => {
    const r = await karsiTarafEkle(await jetonUye(p), u.vkn, u.company_name);
    return { u, p, relationshipId: r.relationship_id, ilkDurum: r.status };
  });

  kontrol('Üye eklemek ONAY bekletiyor (PLAN §5)',
    sonuc.every((s) => s.ilkDurum === 'pending'),
    `${sonuc.filter((s) => s.ilkDurum === 'pending').length}/${sonuc.length} pending`);

  let onaylı = 0;
  for (const s of sonuc) {
    const r = await rpc(await jetonUye(s.u), 'respond_to_connection_request', {
      p_relationship_id: s.relationshipId, p_accept: true,
    });
    if (r.ok) onaylı++;
    else log(`    ! onay reddedildi: ${r.mesaj}`);
  }
  kontrol('Onayla düğmesi çalışıyor (42804 regresyonu)', onaylı === sonuc.length,
    `${onaylı}/${sonuc.length}`);

  const aktif = await api(
    `relationships?id=in.(${sonuc.map((s) => s.relationshipId).join(',')})&select=id,status`,
  );
  kontrol('Onaylananlar aktif oldu',
    aktif.every((r) => r.status === 'active'),
    `${aktif.filter((r) => r.status === 'active').length}/${aktif.length}`);

  return sonuc;
}
