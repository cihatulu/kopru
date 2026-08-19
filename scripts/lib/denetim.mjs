/**
 * KÖPRÜ — doğrulama koşusu, Faz E: kapsam, yetki ve izolasyon denetimi.
 *
 * ÜYELİKTEN ÖNCE ÇALIŞIR. Misafirler üyeliğe geçtikten sonra kapsam
 * kuralları bilerek kalkıyor; sızıntı sorusunu o noktadan sonra sormanın
 * anlamı kalmaz.
 *
 * SORULAN TEK SORU
 * "Bir tarafın göremeyeceği bir satırı, hangi kapıdan olursa olsun,
 * gerçekten göremiyor mu?" Kapılar: REST tablo sorgusu, SECURITY DEFINER
 * RPC, service role, `anon`, personel oturumu ve takip linki.
 */
import {
  api, apiAs, rpc, rpcSR, say, log, kontrol, bulgu, kova,
  misafirGiris, personelGiris, BASE, PUB,
} from './kopru.mjs';
import { SIFRE } from './kurulum.mjs';

export { fazF } from './birlesme.mjs';

export async function fazE(durum, jetonUye) {
  log('\n=== FAZ E — kapsam, yetki ve izolasyon denetimi ===');
  await misafirKapsami(durum);
  await ozetRpcTutarliligi(durum);
  await rolIzolasyonu(durum);
  await anonVeServiceRole(durum);
  await takipLinki(durum);
  await davetVeDuyuru(durum, jetonUye);
  await leadTetikleyicisi(durum);
}

// ─────────────────────────────────────────────────── misafir sponsor kapsamı

/**
 * Misafir üretici sponsor A ile girdiğinde B'nin hiçbir şeyini görmemeli.
 *
 * ÖRNEKLEME: bütün misafirler aynı kodu, aynı politikaları ve aynı kapsam
 * fonksiyonunu paylaşıyor; 100 org'da 300 giriş yapmak aynı cevabı 300 kez
 * almaktan ibaret olurdu. Misafir girişi ayrıca seri yürümek zorunda
 * (`app_metadata.sponsor_org_id` tekil bir alan, üzerine yazılıyor), yani
 * pahalı. Örneklem `misafirOrnek` kadar misafir × bütün sponsorları.
 */
async function misafirKapsami(durum) {
  log('\n  — misafir sponsor izolasyonu —');
  const ornekler = durum.katalog.misafirKatalog.slice(0, durum.PROFIL.misafirOrnek);
  const sizinti = { urun: 0, grup: 0, siparis: 0, cari: 0, ssh: 0, sshLog: 0, duyuru: 0 };
  let denenen = 0;

  for (const m of ornekler) {
    if (m.dilimler.length < 2) continue;
    for (let i = 0; i < m.dilimler.length; i++) {
      const ben = m.dilimler[i];
      const oteki = m.dilimler[(i + 1) % m.dilimler.length];
      denenen++;
      const tk = await misafirGiris('manufacturer', ben.sponsor.org.vkn, m.misafir.vkn, SIFRE);

      const urun = await apiAs(tk, `products?id=eq.${oteki.ozel}&select=id`).catch(() => []);
      if (urun.length) sizinti.urun++;

      if (oteki.grupId) {
        const grup = await apiAs(tk, `product_groups?id=eq.${oteki.grupId}&select=id`).catch(() => []);
        if (grup.length) sizinti.grup++;
      }

      const sip = await apiAs(tk,
        `orders?retailer_org_id=eq.${oteki.sponsor.org.id}&select=id&limit=5`).catch(() => []);
      if (sip.length) sizinti.siparis++;

      const cari = await apiAs(tk,
        `transactions?retailer_org_id=eq.${oteki.sponsor.org.id}&select=id&limit=5`).catch(() => []);
      if (cari.length) sizinti.cari++;

      const ssh = await apiAs(tk,
        `ssh_requests?retailer_org_id=eq.${oteki.sponsor.org.id}&select=id&limit=5`).catch(() => []);
      if (ssh.length) sizinti.ssh++;

      /*
        K6 — `ssh_status_logs` sponsor filtresi taşımıyor.
        `ssh_requests` doğru filtreleniyorsa bile, log tablosu üzerinden
        aynı bilgi sızabilir: kaydın var olduğu, ne zaman hangi duruma
        geçtiği ve aktör org'u.
      */
      const logSatirlari = await apiAs(tk,
        `ssh_status_logs?actor_org_id=eq.${oteki.sponsor.org.id}&select=id&limit=5`).catch(() => []);
      if (logSatirlari.length) sizinti.sshLog++;

      const duyuru = await apiAs(tk,
        `announcements?target_retailer_org_id=eq.${oteki.sponsor.org.id}&select=id&limit=5`).catch(() => []);
      if (duyuru.length) sizinti.duyuru++;
    }
  }

  if (!denenen) { log('    (çok sponsorlu örnek yok, atlandı)'); return; }
  log(`    ${denenen} misafir oturumu denendi.`);
  kontrol('Ürün kapsamı sızdırmıyor', sizinti.urun === 0, `${sizinti.urun}/${denenen} sızıntı`);
  kontrol('Grup kapsamı sızdırmıyor', sizinti.grup === 0, `${sizinti.grup}/${denenen}`);
  kontrol('Sipariş kapsamı sızdırmıyor', sizinti.siparis === 0, `${sizinti.siparis}/${denenen}`);
  kontrol('Cari kapsamı sızdırmıyor', sizinti.cari === 0, `${sizinti.cari}/${denenen}`);
  kontrol('SSH kapsamı sızdırmıyor', sizinti.ssh === 0, `${sizinti.ssh}/${denenen}`);

  bulgu('K6', 'ssh_status_logs sponsor filtresi yok',
    sizinti.sshLog > 0 ? 'kanitlandi' : 'curutuldu',
    `${sizinti.sshLog}/${denenen} oturumda diğer sponsorun log satırı okundu`);
  bulgu('K7', 'announcements owner_all kapsamsız',
    sizinti.duyuru > 0 ? 'kanitlandi' : 'curutuldu',
    `${sizinti.duyuru}/${denenen} oturumda diğer sponsorun duyurusu okundu`);
}

/**
 * K22 — SECURITY DEFINER özet RPC'leri sponsor izolasyonunu delip geçiyor mu?
 *
 * `dashboard_summary` SECURITY DEFINER'dır, yani RLS'i bypass eder. Sayaçların
 * çoğuna sponsor filtresi elle eklenmiş — ama `product_count`'a EKLENMEMİŞ:
 * gövdesi düpedüz `where owner_org_id = v_me and is_active`. Misafir üretici
 * sponsor A ile girdiğinde katalogda A'nın 2 ürününü görür, ama karttaki sayı
 * bütün sponsorların ürünlerini toplar. Kullanıcı görmediği bir şeyin
 * sayısını okur.
 *
 * Sipariş sayacını değil ÜRÜN sayacını karşılaştırmamızın sebebi bu: filtre
 * eksikliği orada.
 */
async function ozetRpcTutarliligi(durum) {
  log('\n  — özet RPC tutarlılığı —');
  const m = durum.katalog.misafirKatalog[0];
  if (!m || m.dilimler.length < 2) { log('    (örnek yok)'); return; }
  const d = m.dilimler[0];
  const tk = await misafirGiris('manufacturer', d.sponsor.org.vkn, m.misafir.vkn, SIFRE);

  const tablo = await apiAs(tk, 'products?select=id&limit=1000').catch(() => []);
  const ozet = await rpc(tk, 'dashboard_summary', {});
  const rpcSayi = Number(ozet.veri?.product_count ?? NaN);

  if (!ozet.ok || Number.isNaN(rpcSayi)) {
    bulgu('K22', 'özet RPC kapsam filtresini atlıyor', 'test-edilemedi',
      `dashboard_summary okunamadı: ${ozet.mesaj.slice(0, 100) || JSON.stringify(ozet.veri).slice(0, 120)}`);
    return;
  }
  bulgu('K22', 'dashboard_summary.product_count kapsam filtresi taşımıyor',
    rpcSayi > tablo.length ? 'kanitlandi' : 'curutuldu',
    `katalogda ${tablo.length} ürün görünüyor, kart ${rpcSayi} yazıyor`);
}

// ─────────────────────────────────────────────────── rol izolasyonu

/**
 * K19 ve K21 — personel giriş yolunun iki ayrı kusuru.
 *
 * K19: `login` Edge Function personel girişinde org'un TÜM personelini
 * sırayla bcrypt ile deniyor. Eşleşmeyenlerin `failed_attempts` sayacı
 * artıyor — yani başka birinin girişi masum personeli kilide sürüklüyor.
 * Hepsi aynı şifreyi paylaştığı için ilk eşleşen kazanır; sayaç artışını
 * görmek adına kasıtlı olarak YANLIŞ şifreyle de bir giriş deniyoruz.
 *
 * K21: `accountant` rolü `staff_scope` izolasyonunun dışında.
 */
async function rolIzolasyonu(durum) {
  log('\n  — rol izolasyonu —');
  const p = durum.perakendeciler[0];
  if (!p) return;

  const personel = await api(
    `users?org_id=eq.${p.id}&org_role=in.(staff,accountant)&select=id,user_code,org_role,failed_attempts`);
  if (personel.length < 2) { log('    (personel yok)'); return; }

  await api(`users?org_id=eq.${p.id}&org_role=in.(staff,accountant)`, {
    method: 'PATCH', body: JSON.stringify({ failed_attempts: 0, locked_until: null }),
  });

  let girisOk = false;
  try { await personelGiris('retailer', p.vkn, SIFRE); girisOk = true; } catch { /* ölçülüyor */ }
  kontrol('Personel girişi çalışıyor', girisOk);

  // Yanlış şifre: hiçbiri eşleşmez, hepsinin sayacı artmalı.
  try { await personelGiris('retailer', p.vkn, 'kesinlikle-yanlis'); } catch { /* beklenen */ }
  const sonra = await api(
    `users?org_id=eq.${p.id}&org_role=in.(staff,accountant)&select=user_code,failed_attempts`);
  const artan = sonra.filter((u) => u.failed_attempts > 0);
  bulgu('K19', 'personel girişi O(N) bcrypt ve masum sayaç artırıyor',
    artan.length > 1 ? 'kanitlandi' : 'curutuldu',
    `tek yanlış giriş ${artan.length}/${sonra.length} personelin sayacını artırdı`);

  await api(`users?org_id=eq.${p.id}&org_role=in.(staff,accountant)`, {
    method: 'PATCH', body: JSON.stringify({ failed_attempts: 0, locked_until: null }),
  });

  // K21 — muhasebecinin görüş alanı.
  const muhasebeci = personel.find((u) => u.org_role === 'accountant');
  const kapsamli = personel.find((u) => u.org_role === 'staff');
  if (!muhasebeci || !kapsamli) {
    bulgu('K21', 'accountant staff_scope izolasyonunun dışında', 'test-edilemedi', 'rol seti eksik');
    return;
  }

  const tumIliski = await api(`relationships?retailer_org_id=eq.${p.id}&select=id`);
  const [ilk] = tumIliski;
  if (ilk) {
    await api('staff_scope', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ staff_user_id: kapsamli.id, retailer_org_id: p.id }),
    }).catch(() => null);
  }

  /*
    Muhasebeci ile personel aynı şifreyi paylaşıyor; Edge Function ilk
    eşleşeni döndürdüğü için hangi kullanıcının oturumunu aldığımızı
    garanti edemeyiz. Bu yüzden K21 kod düzeyinde raporlanır: ölçüm için
    ayrı şifreli bir muhasebeci gerekir ve bu, koşunun kapsamını aşar.
  */
  const scopeSatirlari = await api(`staff_scope?staff_user_id=eq.${muhasebeci.id}&select=staff_user_id`);
  bulgu('K21', 'accountant staff_scope izolasyonunun dışında',
    scopeSatirlari.length === 0 ? 'kanitlandi' : 'curutuldu',
    scopeSatirlari.length === 0
      ? 'muhasebeci için hiç staff_scope satırı yok — kapsam kavramı ona uygulanmıyor'
      : `${scopeSatirlari.length} kapsam satırı bulundu`);
}

// ─────────────────────────────────────────────────── anon ve service role

/**
 * K17 ve K18 — JWT'siz çağrılar.
 *
 * K17: service role'de `auth.uid()` NULL. `v_rel.retailer_org_id <> v_me`
 * gibi bir koşul, `v_me` NULL olduğunda NULL üretir ve `if` bunu FALSE
 * sayar — yani "yetkin yok" dalına HİÇ girmez. Üç değerli mantık, yetki
 * kapısını sessizce açık bırakır.
 *
 * K18: RPC'lere açık `grant` verilmemişse `PUBLIC EXECUTE` geçerlidir ve
 * `anon` rolü çağırabilir.
 */
async function anonVeServiceRole(durum) {
  log('\n  — anon / service role kapıları —');
  /*
    AÇIK bir sipariş şart. `tam` akıştakiler `delivered` durumunda ve
    `advance_order_status` yetki kapısından ÖNCE "kapalı sipariş" kapısına
    çarpıyor — o zaman ölçtüğümüz şey yetki değil, durum olurdu. Kısmi
    sevkiyattaki sipariş `partially_shipped`, yani hâlâ açık.
  */
  const tam = durum.siparis.kismi[0] ?? durum.siparis.tam[0];
  if (!tam) return;

  const sr = await rpcSR('advance_order_status', { p_order_id: tam.id, p_status: 'delivered' });
  bulgu('K17', 'service role çağrısında yetki kapısı sessizce açılıyor',
    sr.ok ? 'kanitlandi' : 'curutuldu',
    sr.ok ? 'JWT olmadan advance_order_status geçti, actor NULL yazıldı'
          : `reddedildi: ${sr.mesaj.slice(0, 100)}`);

  const anonlar = ['advance_order_status', 'cancel_order_atomic', 'create_return_request'];
  const gecen = [];
  for (const ad of anonlar) {
    const r = await rpc(null, ad,
      ad === 'create_return_request'
        ? { p_order_id: tam.id, p_items: [], p_reason: 'anon sonda' }
        : { p_order_id: tam.id, ...(ad === 'advance_order_status' ? { p_status: 'delivered' } : {}) });
    // 401/403 = kapı kapalı. 400/500 = çağrı ULAŞTI, içeride patladı.
    if (r.durum !== 401 && r.durum !== 403 && r.durum !== 404) gecen.push(`${ad}:${r.durum}`);
  }
  bulgu('K18', 'RPC\'lerde açık grant yok — anon çalıştırabiliyor',
    gecen.length > 0 ? 'kanitlandi' : 'curutuldu',
    gecen.length > 0 ? `anon çağrısı kapıdan geçti: ${gecen.join(', ')}` : 'hepsi 401/403');
}

/** Takip linki `anon` ile açılır ve FİYAT SIZDIRMAMALIDIR. */
async function takipLinki(durum) {
  log('\n  — sipariş takip linki —');
  const tam = durum.siparis.tam[0];
  if (!tam) return;
  const [o] = await api(`orders?id=eq.${tam.id}&select=order_token,order_no`);
  if (!o?.order_token) {
    bulgu('K-takip', 'takip linki', 'test-edilemedi', 'siparişte order_token yok');
    return;
  }
  const r = await rpc(null, 'track_order', { p_token: o.order_token });
  kontrol('Takip linki anon ile açılıyor', r.ok, r.ok ? '' : r.mesaj.slice(0, 100));
  if (!r.ok) return;

  /*
    ÜÇ FİYAT KATMANI AYRI AYRI SORULUR — hepsini tek "fiyat sızıyor mu"
    sorusuna indirmek yanlış cevap verir.

    Katman 3 (perakendecinin müşterisine verdiği fiyat) bu linkte BULUNMALI:
    link zaten o müşteri için üretiliyor, gördüğü kendi faturası.
    Katman 1 (üretici maliyeti) ve katman 2 (üretici satış fiyatı) ise
    müşteriye ait değil; oradan görünmesi tedarik zincirini ifşa eder.
  */
  const metin = JSON.stringify(r.veri);
  const katman12 = ['supplier_unit_price', 'supplier_price', 'cost_price', 'total_amount'];
  const sizan = katman12.filter((a) => metin.includes(a));
  kontrol('Takip linki KATMAN 1–2 sızdırmıyor', sizan.length === 0,
    sizan.length ? `sızan alanlar: ${sizan.join(', ')}` : 'temiz');

  /*
    `price_difference` şemada açıkça KATMAN 2 olarak etiketli: üreticinin
    özel talep için istediği birim ek ücret. Anonim, tahmin edilebilir bir
    bağlantıda görünüyor. Müşteriye "cam kapak farkı" göstermek meşru bir
    ihtiyaç olabilir — ama o zaman farkın katman 3'e yansıtılmış hâli
    gösterilmeli, üreticinin istediği tutar değil.
  */
  const farkVar = metin.includes('price_difference');
  bulgu('K-takip', 'takip linki KATMAN 2 fark tutarını anon\'a gösteriyor',
    farkVar ? 'kanitlandi' : 'curutuldu',
    farkVar ? 'items[].price_difference anon yanıtında' : 'yok');
}

/** Davet zinciri ve duyuru hedeflemesi. */
async function davetVeDuyuru(durum, jetonUye) {
  log('\n  — davet ve duyuru —');
  const u = durum.ureticiler[0];
  const p = durum.perakendeciler[0];
  if (!u || !p) return;

  const utk = await jetonUye(u);
  const dav = await rpc(utk, 'create_invitation', {
    p_company_name: 'DAVETLI FIRMA', p_vkn_tc: '4899000001', p_valid_days: 7,
  });
  kontrol('Davet oluşturuldu', dav.ok, dav.ok ? '' : dav.mesaj.slice(0, 120));
  if (dav.ok) {
    const t = Array.isArray(dav.veri) ? dav.veri[0]?.token : dav.veri?.token;
    kontrol('Davet token üretildi', Boolean(t), t ? `${String(t).slice(0, 8)}…` : '');
  }

  // Hedefli duyuru: yalnız o perakendeciye gitmeli.
  const hedefli = await apiAs(utk, 'announcements', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      owner_org_id: u.id, target_retailer_org_id: p.id,
      title: 'Hedefli duyuru', body: 'yalnizca bir perakendeciye',
    }),
  }).catch((e) => ({ hata: e.message }));
  kontrol('Hedefli duyuru yazıldı', Array.isArray(hedefli) && hedefli.length > 0,
    hedefli?.hata?.slice(0, 120) ?? '');

  const genel = await apiAs(utk, 'announcements', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ owner_org_id: u.id, title: 'Genel duyuru', body: 'tum musterilere' }),
  }).catch((e) => ({ hata: e.message }));
  kontrol('Genel duyuru yazıldı', Array.isArray(genel) && genel.length > 0,
    genel?.hata?.slice(0, 120) ?? '');

  if (Array.isArray(hedefli) && hedefli.length) {
    const baska = durum.perakendeciler[1];
    if (baska) {
      const btk = await jetonUye(baska);
      const gorunen = await apiAs(btk, `announcements?id=eq.${hedefli[0].id}&select=id`).catch(() => []);
      kontrol('Hedefli duyuru başkasına görünmüyor', gorunen.length === 0,
        gorunen.length ? 'SIZDI' : 'temiz');
    }
  }
}

/**
 * K36 — her `organizations` INSERT'ü `leads` üzerinden bir UPDATE tetikliyor mu?
 *
 * Boş bir `leads` tablosunda tetikleyici çalışsa da güncelleyecek satır
 * bulamaz; "0 eşleşme" ölçüm değil, ölçüm yokluğudur. Bu yüzden önce
 * kaydolmamış bir VKN için lead satırı açılıyor, sonra o VKN ile org
 * yaratılıyor. Tetikleyici çalışıyorsa lead kendiliğinden eşleşir.
 */
async function leadTetikleyicisi(durum) {
  log('\n  — lead tetikleyicisi —');
  const vkn = '4890000001';
  await api(`leads?vkn_tc=eq.${vkn}`, { method: 'DELETE' }).catch(() => null);
  await api(`organizations?vkn_tc=eq.${vkn}`, { method: 'DELETE' }).catch(() => null);

  await api('leads', {
    method: 'POST',
    body: JSON.stringify({ company_name: 'LEAD SONDA', vkn_tc: vkn, kind: 'retailer' }),
  });
  await api('organizations', {
    method: 'POST',
    body: JSON.stringify({ kind: 'retailer', company_name: 'LEAD SONDA ORG', vkn_tc: vkn }),
  });
  const [lead] = await api(`leads?vkn_tc=eq.${vkn}&select=matched_org_id,status`);

  bulgu('K36', 'her organizations INSERT\'ü leads UPDATE tetikliyor',
    lead?.matched_org_id ? 'kanitlandi' : 'curutuldu',
    lead?.matched_org_id
      ? `lead org açılır açılmaz eşleşti (durum: ${lead.status}) — her INSERT bu maliyeti ödüyor`
      : 'tetikleyici lead\'i güncellemedi');
}
