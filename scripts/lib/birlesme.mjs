/**
 * KÖPRÜ — doğrulama koşusu, Faz F: üyeliğe geçiş, birleştirme ve cari denetimi.
 *
 * BU FAZ ÜRÜNÜN SATIŞ ARGÜMANINI SINIYOR
 * Misafir, kendisini ekleyen her karşı taraf için ayrı giriş yapar. On
 * müşterisi varsa on ayrı giriş. Üye olduğunda hepsi TEK panelde birleşir —
 * abonelik tam olarak bunun karşılığı. Dolayısıyla birleştirmenin sessizce
 * veri kaybetmesi, ürünün vaadini boşa çıkarır.
 *
 * CARİ ORACLE'I NEDEN ELDE YAZILIYOR (K15)
 * `isSummaryConsistent` bir doğrulama gibi duruyor ama `closing` zaten
 * `opening + debit − credit` ile TÜRETİLİYOR; yani tanımı gereği her zaman
 * true. Oracle olarak kullanılamaz. Buradaki altı değişmez, satırların
 * kendisinden bağımsız olarak hesaplanıyor.
 */
import { api, apiAs, rpc, rpcSR, say, log, kontrol, bulgu, kova, misafirGiris } from './kopru.mjs';
import { ORTAK_AD } from './katalog.mjs';
import { SIFRE } from './kurulum.mjs';

/**
 * `in.(...)` listesini parçalara bölerek sorgular ve sonuçları birleştirir.
 *
 * YAŞANAN HATA: 100 misafir üreticinin ~1000 siparişinin kimliğini tek bir
 * `in.()` içine koyunca URL 40 KB'ı aştı ve istek daha sunucuya varmadan
 * öldü. Küçük ölçekte (12 sipariş) hiç görünmeyen, yalnız tam ölçekte
 * ortaya çıkan bir sınır. Denetim sorgularının hepsi bu yardımcıdan geçer.
 */
async function parcali(idler, sorgu, parca = 60) {
  const cikti = [];
  for (let i = 0; i < idler.length; i += parca) {
    cikti.push(...await api(sorgu(idler.slice(i, i + parca))));
  }
  return cikti;
}

/** PostgREST sayfa sınırını aşmadan tüm satırları çeker (keyset, A19). */
async function tumu(tablo, filtre, kolonlar) {
  const cikti = [];
  let son = '';
  for (;;) {
    const q = `${tablo}?${filtre}&select=${kolonlar}&order=id.asc&limit=1000` +
              (son ? `&id=gt.${son}` : '');
    const sayfa = await api(q);
    cikti.push(...sayfa);
    if (sayfa.length < 1000) break;
    son = sayfa[sayfa.length - 1].id;
  }
  return cikti;
}

export async function fazF(durum, jetonUye) {
  log('\n=== FAZ F — üyeliğe geçiş, birleştirme ve cari denetimi ===');

  await cariDegismezleri(durum);
  await siparisZinciri(durum);
  await manuelIslemDegismezligi(durum);
  const once = await birlestirmeOncesi(durum);
  await uyeligeGecis(durum);
  await birlestirmeSonrasi(durum, once);
  await bayatJeton(durum);
  await geriAlma(durum);
}

// ───────────────────────────────────────────────────────── cari değişmezleri

async function cariDegismezleri(durum) {
  log('\n  — cari değişmezleri —');
  const orglar = await api(`organizations?vkn_tc=like.48*&select=id`);
  if (!orglar.length) { log('    (test org bulunamadı)'); return; }
  const idler = orglar.map((o) => o.id);

  const hareketler = [];
  for (let i = 0; i < idler.length; i += 40) {
    const dilim = `(${idler.slice(i, i + 40).join(',')})`;
    hareketler.push(...await tumu(
      'transactions',
      `or=(manufacturer_org_id.in.${dilim},retailer_org_id.in.${dilim})`,
      'id,relationship_id,type,amount,balance_after,order_id,created_at',
    ));
  }
  const gorulen = new Set();
  const tekil = hareketler.filter((t) => !gorulen.has(t.id) && gorulen.add(t.id));
  log(`    ${tekil.length} cari hareket, ${new Set(tekil.map((t) => t.relationship_id)).size} ilişki.`);

  const gruplar = new Map();
  for (const t of tekil) {
    if (!gruplar.has(t.relationship_id)) gruplar.set(t.relationship_id, []);
    gruplar.get(t.relationship_id).push(t);
  }

  let bakiyeHata = 0, zincirHata = 0, cokluKok = 0, ilkOrnek = '';
  for (const [rid, satirlar] of gruplar) {
    satirlar.sort((a, b) =>
      a.created_at === b.created_at ? a.id.localeCompare(b.id) : a.created_at.localeCompare(b.created_at));

    // 1 — son satırın bakiyesi, borç eksi alacak toplamına eşit olmalı.
    const net = satirlar.reduce((t, s) =>
      t + (s.type === 'debit' ? Number(s.amount) : -Number(s.amount)), 0);
    const son = Number(satirlar[satirlar.length - 1].balance_after);
    if (Math.abs(net - son) > 0.011) {
      bakiyeHata++;
      if (!ilkOrnek) ilkOrnek = `ilişki ${rid.slice(0, 8)}: net ₺${net.toFixed(2)} ≠ son ₺${son.toFixed(2)}`;
    }

    // 2 — yürüyen bakiye zinciri: her satır bir öncekinden kendi tutarı kadar sapmalı.
    let yuruyen = 0;
    for (const s of satirlar) {
      yuruyen += s.type === 'debit' ? Number(s.amount) : -Number(s.amount);
      if (Math.abs(yuruyen - Number(s.balance_after)) > 0.011) { zincirHata++; break; }
    }

    // 3 — sipariş başına kök debit TEKİL (kilitli kural 7).
    const kokSayisi = new Map();
    for (const s of satirlar) {
      if (s.type !== 'debit' || !s.order_id) continue;
      kokSayisi.set(s.order_id, (kokSayisi.get(s.order_id) ?? 0) + 1);
    }
    if ([...kokSayisi.values()].some((n) => n > 1)) cokluKok++;
  }

  kontrol('1. Son bakiye = Σborç − Σalacak', bakiyeHata === 0,
    bakiyeHata ? `${bakiyeHata}/${gruplar.size} ilişki bozuk · ${ilkOrnek}` : `${gruplar.size} ilişki`);
  kontrol('2. Yürüyen bakiye zinciri kopmuyor', zincirHata === 0,
    zincirHata ? `${zincirHata}/${gruplar.size} ilişkide kopuk` : `${gruplar.size} ilişki`);
  kontrol('3. Sipariş başına kök debit tekil', cokluKok === 0,
    cokluKok ? `${cokluKok} ilişkide çoklu debit` : 'tekil');

  // 4 — RPC'nin verdiği bakiye tablodan hesaplananla aynı mı?
  const p = durum.perakendeciler[0];
  if (p) {
    const tk = await jetonKisayol(durum, p);
    const hesaplar = await rpc(tk, 'ledger_accounts_for_me', {});
    if (hesaplar.ok && Array.isArray(hesaplar.veri) && hesaplar.veri.length) {
      const bozuk = hesaplar.veri.filter((h) =>
        Math.abs(Number(h.balance) - (Number(h.total_debit) - Number(h.total_credit))) > 0.011);
      kontrol('4. ledger_accounts_for_me kendi içinde tutarlı', bozuk.length === 0,
        `${hesaplar.veri.length} hesap, ${bozuk.length} sapma`);
    } else {
      kontrol('4. ledger_accounts_for_me okunabildi', false,
        hesaplar.mesaj.slice(0, 120) || 'boş döndü');
    }
  }

  /*
    K12 — `recalculate_relationship_balances` kilitli kural 7'nin tam aksini
    yapıyor: geçmiş satırları YERİNDE UPDATE ediyor. Kanıt için çağırmıyoruz;
    çağırmak, denetlediğimiz veriyi bozardı. Fonksiyonun varlığı ve gövdesi
    kanıt olarak yeterli — burada yalnız etkisini ölçebileceğimizi işaretliyoruz.
  */
  bulgu('K12', 'recalculate_relationship_balances geçmişi UPDATE ediyor', 'test-edilemedi',
    'çağrılması denetlenen veriyi bozardı; gövde incelemesiyle sabit');
}

async function jetonKisayol(durum, org) {
  const { uyeGiris } = await import('./kopru.mjs');
  return uyeGiris(org.kind, org.vkn, SIFRE);
}

// ───────────────────────────────────────────────────────── sipariş zinciri

/**
 * K24 — `order_status_logs` zinciri.
 *
 * Her kaydın `from_status`'u, bir öncekinin `to_status`'u olmak zorunda.
 * `approve_return_request` bunu sabit `'delivered'` yazıyor; sipariş başka
 * bir durumdayken iade onaylanırsa zincir kopar ve geçmiş yalan söyler.
 */
async function siparisZinciri(durum) {
  log('\n  — sipariş durum zinciri —');
  const hedefler = [...durum.siparis.tam, ...durum.siparis.kismi].slice(0, 60).map((o) => o.id);
  if (!hedefler.length) return;

  const kayitlar = await api(
    `order_status_logs?order_id=in.(${hedefler.join(',')})&select=order_id,from_status,to_status,created_at,id&order=created_at.asc`);

  const grup = new Map();
  for (const k of kayitlar) {
    if (!grup.has(k.order_id)) grup.set(k.order_id, []);
    grup.get(k.order_id).push(k);
  }

  let kopuk = 0, ornek = '';
  for (const [oid, liste] of grup) {
    for (let i = 1; i < liste.length; i++) {
      if (liste[i].from_status !== liste[i - 1].to_status) {
        kopuk++;
        if (!ornek) ornek = `${oid.slice(0, 8)}: ${liste[i - 1].to_status} → kayıt "${liste[i].from_status}"`;
        break;
      }
    }
  }
  kontrol('6. Durum log zinciri tutarlı', kopuk === 0,
    kopuk ? `${kopuk}/${grup.size} siparişte kopuk · ${ornek}` : `${grup.size} sipariş`);
  bulgu('K24', 'approve_return_request from_status\'u sabit yazıyor',
    kopuk > 0 ? 'kanitlandi' : 'curutuldu',
    kopuk > 0 ? `${kopuk} siparişte zincir kopuk · ${ornek}` : 'zincir sağlam');

  /*
    5 — kök siparişin borcu, KÖK + ÇOCUKLAR toplamına eşit olmalı.

    Çocukları hesaba katmak şart: kısmi sevkiyat kökün `total_amount`'ını
    sevk edilen kadar düşürüp kalanı çocuk siparişe taşıyor. Cari ise
    dokunulmadan ilk yazıldığı gibi duruyor (kilitli kural 7) — yani 40.000
    borç, 20.000 kök + 20.000 çocuk olarak dağılıyor. Yalnız köke bakan bir
    kontrol, doğru çalışan sistemi hatalı gösterirdi.
  */
  const siparisler = await api(
    `orders?id=in.(${hedefler.join(',')})&select=id,total_amount,status,parent_order_id`);
  const cocukToplam = await api(
    `orders?parent_order_id=in.(${hedefler.join(',')})&select=parent_order_id,total_amount`);
  const cocukHaritasi = new Map();
  for (const c of cocukToplam) {
    cocukHaritasi.set(c.parent_order_id, (cocukHaritasi.get(c.parent_order_id) ?? 0) + Number(c.total_amount));
  }
  const borclar = await api(
    `transactions?order_id=in.(${hedefler.join(',')})&type=eq.debit&select=order_id,amount`);
  const borcHaritasi = new Map();
  for (const b of borclar) borcHaritasi.set(b.order_id, (borcHaritasi.get(b.order_id) ?? 0) + Number(b.amount));

  const temiz = siparisler.filter((o) => o.status !== 'cancelled' && !o.parent_order_id);
  const sapan = temiz.filter((o) => {
    const agac = Number(o.total_amount) + (cocukHaritasi.get(o.id) ?? 0);
    return Math.abs(agac - (borcHaritasi.get(o.id) ?? 0)) > 0.011;
  });
  kontrol('5. Sipariş ağacı toplamı = cari borcu', sapan.length === 0,
    sapan.length ? `${sapan.length}/${temiz.length} sipariş sapıyor` : `${temiz.length} sipariş`);

  // Kısmi sevkiyat çocuk siparişi üretti mi ve cariye DOKUNMADI mı?
  const cocuklar = await api(
    `orders?parent_order_id=in.(${durum.siparis.kismi.map((k) => k.id).join(',')})&select=id,order_no,parent_order_id,total_amount`);
  kontrol('Kısmi sevkiyat çocuk sipariş üretti', cocuklar.length === durum.siparis.kismi.length,
    `${cocuklar.length}/${durum.siparis.kismi.length}`);
  if (cocuklar.length) {
    const cocukBorc = await api(
      `transactions?order_id=in.(${cocuklar.map((c) => c.id).join(',')})&select=id`);
    kontrol('Çocuk sipariş cariye DOKUNMUYOR', cocukBorc.length === 0,
      cocukBorc.length ? `${cocukBorc.length} hareket yazılmış` : 'temiz');
    kontrol('Çocuk sipariş no\'su KÖK/n biçiminde',
      cocuklar.every((c) => /\/\d+$/.test(c.order_no)),
      cocuklar[0]?.order_no ?? '');
  }

  // K16 — iki iade RPC'si aynı işi farklı tutarla mı yapıyor?
  const iadeler = durum.siparis.iade.filter((i) => i.onay);
  if (iadeler.length) {
    const alacak = await api(
      `transactions?order_id=in.(${iadeler.map((i) => i.orderId).join(',')})&type=eq.credit&select=order_id,amount,description`);
    const kalemler = await api(
      `order_items?order_id=in.(${iadeler.map((i) => i.orderId).join(',')})&select=order_id,supplier_unit_price,price_difference`);
    const farkli = alacak.filter((a) => {
      const k = kalemler.find((x) => x.order_id === a.order_id);
      if (!k || Number(k.price_difference) === 0) return false;
      return Math.abs(Number(a.amount) - Number(k.supplier_unit_price)) < 0.011;
    });
    bulgu('K16', 'confirm_return_atomic price_difference\'ı hesaba katmıyor',
      farkli.length > 0 ? 'kanitlandi' : 'curutuldu',
      farkli.length > 0
        ? `${farkli.length} iadede alacak = birim fiyat, fark eklenmemiş`
        : `${alacak.length} iade alacağı incelendi, sapma yok`);
  } else {
    bulgu('K16', 'confirm_return_atomic price_difference\'ı hesaba katmıyor', 'test-edilemedi',
      'onaylı iade üretilemedi');
  }
}

/** K13 — manuel cari satırlarında değişmezlik var mı? */
async function manuelIslemDegismezligi(durum) {
  log('\n  — manuel cari değişmezliği —');
  const manuel = await api(
    `transactions?order_id=is.null&type=eq.credit&select=id,relationship_id,amount,balance_after&limit=1`);
  if (!manuel.length) {
    bulgu('K13', 'update/delete_manual_transaction değişmezliği kırıyor', 'test-edilemedi',
      'manuel cari satırı bulunamadı');
    return;
  }
  const hedef = manuel[0];
  const oncekiSayi = await say(`transactions?relationship_id=eq.${hedef.relationship_id}&select=id`);
  const r = await rpcSR('update_manual_transaction', {
    p_transaction_id: hedef.id, p_type: 'credit',
    p_amount: Number(hedef.amount) + 1, p_description: 'sonda',
  });
  const sonrakiSayi = await say(`transactions?relationship_id=eq.${hedef.relationship_id}&select=id`);
  const [sonra] = await api(`transactions?id=eq.${hedef.id}&select=amount`);

  const yerindeDegisti = sonra && Math.abs(Number(sonra.amount) - Number(hedef.amount)) > 0.001;
  bulgu('K13', 'manuel cari satırı YERİNDE güncelleniyor',
    yerindeDegisti ? 'kanitlandi' : r.ok ? 'curutuldu' : 'test-edilemedi',
    yerindeDegisti
      ? `satır UPDATE edildi (dengeleyici INSERT yok: ${oncekiSayi} → ${sonrakiSayi} satır)`
      : r.ok ? 'tutar değişmedi' : `RPC çağrılamadı: ${r.mesaj.slice(0, 100)}`);
}

// ───────────────────────────────────────────────────────── birleştirme

async function birlestirmeOncesi(durum) {
  log('\n  — üyelik öncesi fotoğraf —');
  const kayit = [];
  for (const m of durum.misafirUreticiler) {
    const urunler = await api(
      `products?owner_org_id=eq.${m.id}&select=id,name,code,supplier_price,images,description,managed_by_retailer_org_id,created_at`);
    const fiyatlar = await say(`retail_prices?product_id=in.(${urunler.map((u) => u.id).join(',')})&select=product_id`);
    const gruplar = await api(`product_groups?owner_org_id=eq.${m.id}&select=id`);
    kayit.push({ m, urunler, fiyatSayisi: fiyatlar, gruplar });
  }
  const toplamUrun = kayit.reduce((t, k) => t + k.urunler.length, 0);
  const toplamFiyat = kayit.reduce((t, k) => t + k.fiyatSayisi, 0);
  log(`    ${toplamUrun} ürün, ${toplamFiyat} perakende fiyatı, ` +
      `${kayit.reduce((t, k) => t + k.gruplar.length, 0)} grup.`);

  const ortakSayilari = kayit.map((k) => k.urunler.filter((u) => u.name === ORTAK_AD).length);
  kontrol('Ortak adlı ürün her misafirde birden çok',
    ortakSayilari.every((n) => n >= 2), `en az ${Math.min(...ortakSayilari)} kayıt`);
  /*
    Excel yolundan doğan ürünler (`XLS-` kodlu) bilerek dışarıda: onların
    kapsamsız doğduğu K4 olarak zaten ayrıca raporlanıyor. Bu kontrol
    NORMAL katalog yolunun kapsamı doğru yazıp yazmadığını soruyor; ikisini
    tek sayıya karıştırmak, düzelen tarafı da kırmızı gösterirdi.
  */
  const normal = kayit.flatMap((k) => k.urunler.filter((u) => !String(u.code ?? '').startsWith('XLS-')));
  kontrol('Normal yoldan yazılan her ürün kapsanmış',
    normal.every((u) => u.managed_by_retailer_org_id !== null),
    `${normal.filter((u) => u.managed_by_retailer_org_id === null).length}/${normal.length} kapsamsız`);

  return { kayit, toplamUrun, toplamFiyat };
}

async function uyeligeGecis(durum) {
  log('\n  — üyeliğe geçiş —');
  const jeton = durum.adminJeton;
  let ok = 0, hata = '';
  const hepsi = [...durum.misafirUreticiler, ...durum.misafirPerakendeciler];
  for (const m of hepsi) {
    const r = await rpc(jeton, 'upgrade_org_to_subscriber', {
      // Alt alan adı UNIQUE: misafir üretici ve perakendeci numaraları son
      // altı hanede çakışıyor, tam VKN kullanılmak zorunda.
      p_org_id: m.id, p_plan: 'pro', p_subdomain: `t-mg-${m.vkn}`,
    });
    if (r.ok) ok++; else if (!hata) hata = r.mesaj.slice(0, 200);
  }
  kontrol('Tüm misafirler üyeliğe geçti', ok === hepsi.length, `${ok}/${hepsi.length}${hata ? ' · ' + hata : ''}`);
}

async function birlestirmeSonrasi(durum, once) {
  log('\n  — birleştirme sonucu —');
  let ortakTek = 0, enEskiKorundu = 0, uyariVar = 0;
  let kayipFiyat = 0, yetimGorsel = 0, kayipAciklama = 0, bosGrup = 0, kapsamAcildi = 0;

  for (const k of once.kayit) {
    const sonra = await api(
      // `group_id` ŞART: K11 sondası ürünleri gruba göre sayıyor. Kolon
      // listeden düşünce her grup boş görünür ve sonda yanlış pozitif verir —
      // tam ölçekli koşuda tam olarak bu oldu (300 boş grup dendi, gerçek 1).
      `products?owner_org_id=eq.${k.m.id}&select=id,name,code,group_id,supplier_price,images,description,managed_by_retailer_org_id,price_review_needed`);
    const ortak = sonra.filter((u) => u.name === ORTAK_AD);
    if (ortak.length === 1) ortakTek++;

    const onceOrtak = k.urunler.filter((u) => u.name === ORTAK_AD)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    if (ortak[0] && onceOrtak[0] &&
        Math.abs(Number(ortak[0].supplier_price) - Number(onceOrtak[0].supplier_price)) < 0.011) enEskiKorundu++;
    if (ortak[0]?.price_review_needed === true) uyariVar++;
    if (sonra.every((u) => u.managed_by_retailer_org_id === null)) kapsamAcildi++;

    // K8 — kaç perakende fiyatı sessizce gitti?
    const fiyatSonra = await say(`retail_prices?product_id=in.(${sonra.map((u) => u.id).join(',')})&select=product_id`);
    kayipFiyat += Math.max(0, k.fiyatSayisi - fiyatSonra);

    // K9 / K10 — silinen kopyaların görselleri ve açıklamaları
    const kalanIdler = new Set(sonra.map((u) => u.id));
    for (const eski of k.urunler) {
      if (kalanIdler.has(eski.id)) continue;
      if (Array.isArray(eski.images) && eski.images.length) yetimGorsel += eski.images.length;
      if (eski.description) kayipAciklama++;
    }

    // K11 — boşalan gruplar
    const gruplarSonra = await api(`product_groups?owner_org_id=eq.${k.m.id}&select=id`);
    for (const g of gruplarSonra) {
      const n = sonra.filter((u) => u.group_id === g.id).length;
      if (n === 0) bosGrup++;
    }
  }

  const N = once.kayit.length;
  kontrol('Ortak adlı ürün TEKE indi', ortakTek === N, `${ortakTek}/${N} misafir`);
  kontrol('En eski fiyat korundu', enEskiKorundu === N, `${enEskiKorundu}/${N}`);
  kontrol('Fiyat kontrol uyarısı bırakıldı', uyariVar === N, `${uyariVar}/${N}`);
  kontrol('Kapsam sınırı üyelikle kalktı', kapsamAcildi === N, `${kapsamAcildi}/${N}`);

  bulgu('K8', 'birleştirmede retail_prices uyarısız kayboluyor',
    kayipFiyat > 0 ? 'kanitlandi' : 'curutuldu',
    `${kayipFiyat} perakende fiyatı silindi (öncesi ${once.toplamFiyat})`);
  bulgu('K9', 'kopyanın görselleri yetim kalıyor',
    yetimGorsel > 0 ? 'kanitlandi' : 'curutuldu',
    `${yetimGorsel} görsel bağı silinen ürünle birlikte gitti`);
  bulgu('K10', 'kopyanın açıklama/varyant alanları uyarısız kayboluyor',
    kayipAciklama > 0 ? 'kanitlandi' : 'curutuldu',
    `${kayipAciklama} silinen kopyada dolu açıklama vardı`);
  bulgu('K11', 'boşalan gruplar ölü düğüm olarak kalıyor',
    bosGrup > 0 ? 'kanitlandi' : 'curutuldu', `${bosGrup} boş grup`);

  /*
    GEÇMİŞ BOZULDU MU — birleştirmenin en tehlikeli tarafı.
    `order_items` ve `ssh_requests` ürüne ON DELETE SET NULL ile bağlı.
    Kopya, kendisine bağlı kayıtlar hayatta kalan ürüne TAŞINMADAN silinirse
    geçmiş ürün bağını sessizce kaybeder ve bu geri alınamaz.
  */
  const misafirIdler = once.kayit.map((k) => k.m.id);
  const siparisIdler = (await parcali(misafirIdler,
    (d) => `orders?manufacturer_org_id=in.(${d.join(',')})&select=id&limit=2000`)).map((o) => o.id);
  const kalemler = await parcali(siparisIdler,
    (d) => `order_items?select=id,product_id,order_id&order_id=in.(${d.join(',')})&limit=5000`);
  kontrol('Sipariş kalemlerinin ürün bağı kopmadı',
    kalemler.every((k) => k.product_id !== null),
    `${kalemler.filter((k) => k.product_id === null).length}/${kalemler.length} kopuk`);

  const ssh = await parcali(misafirIdler,
    (d) => `ssh_requests?manufacturer_org_id=in.(${d.join(',')})&select=id,product_id`);
  kontrol('SSH ürün bağı kopmadı', ssh.every((s) => s.product_id !== null),
    `${ssh.filter((s) => s.product_id === null).length}/${ssh.length} kopuk`);
}

/**
 * K26 — üyeliğe geçiş açık oturumu tazeliyor mu?
 *
 * Faz D'de alınan misafir jetonu hâlâ `sponsor_org_id` claim'ini taşıyor.
 * Org artık ÜYE; kullanıcı ekranı yenilemeden tüm kataloğunu görmeli.
 * Görmüyorsa, üyeliğin ilk dakikası "hiçbir şey değişmedi" gibi görünür.
 */
async function bayatJeton(durum) {
  log('\n  — üyelikten sonra açık oturum —');
  const m = durum.katalog.misafirKatalog[0];
  const eski = m?.dilimler?.[0]?.misafirJeton;
  if (!eski) { bulgu('K26', 'üyeliğe geçişte JWT tazelenmiyor', 'test-edilemedi', 'eski jeton yok'); return; }

  const gorunen = await apiAs(eski, `products?owner_org_id=eq.${m.misafir.id}&select=id`).catch(() => []);
  const gercek = await say(`products?owner_org_id=eq.${m.misafir.id}&select=id`);
  bulgu('K26', 'üyeliğe geçişte JWT sponsor claim\'i tazelenmiyor',
    gorunen.length < gercek ? 'kanitlandi' : 'curutuldu',
    `eski jetonla ${gorunen.length} ürün, gerçekte ${gercek} ürün`);

  const yeni = await misafirGiris('manufacturer', m.dilimler[0].sponsor.org.vkn, m.misafir.vkn, SIFRE)
    .catch(() => null);
  kontrol('Üye olan org artık MİSAFİR olarak giremiyor', yeni === null,
    yeni ? 'misafir girişi hâlâ kabul edildi' : 'reddedildi (doğru)');
}

/** K25 — üyelikten geri düşürme, birleştirmenin tersini yapıyor mu? */
async function geriAlma(durum) {
  /*
    Kurban MİSAFİR ÜRETİCİ olmalı: kapsam kolonu `products` üzerinde
    yaşıyor ve ürünlerin sahibi üreticidir. Perakendeci üzerinde ölçüm
    yapmak "0/0 ürün" gibi anlamsız bir sonuç verir.
  */
  const m = durum.misafirUreticiler[durum.misafirUreticiler.length - 1];
  if (!m) return;
  const r = await rpc(durum.adminJeton, 'downgrade_org_to_guest', { p_org_id: m.id });
  if (!r.ok) {
    bulgu('K25', 'downgrade_org_to_guest birleştirmenin tersini yapmıyor', 'test-edilemedi',
      `RPC çağrılamadı: ${r.mesaj.slice(0, 120)}`);
    return;
  }
  const urunler = await api(`products?owner_org_id=eq.${m.id}&select=id,managed_by_retailer_org_id`);
  const kapsamsiz = urunler.filter((u) => u.managed_by_retailer_org_id === null).length;
  bulgu('K25', 'downgrade_org_to_guest kapsamı geri kurmuyor',
    urunler.length > 0 && kapsamsiz === urunler.length ? 'kanitlandi' : 'curutuldu',
    `${kapsamsiz}/${urunler.length} ürün hâlâ kapsamsız`);
}
