/**
 * KÖPRÜ — doğrulama koşusu, Faz D: sipariş yaşam döngüsü.
 *
 * NE ÜRETİLİYOR — her ilişki için
 *   1. TAM AKIŞ      pending → confirmed → in_production → shipped → delivered
 *   2. KISMİ SEVK    pending → confirmed → partially_shipped (+ çocuk sipariş)
 *   3. İPTAL         pending → cancelled  (dengeleyici credit kaydı)
 * İlk sponsorda ayrıca: iade, SSH, finans hareketi, manuel cari talebi.
 *
 * CARİNİN KURALI (kilitli kural 7)
 * Kök siparişin ilk `debit` satırına bir daha dokunulmaz; her düzeltme yeni
 * bir INSERT ile dengelenir. Kısmi sevkiyat çocuk sipariş üretir ama CARİYE
 * DOKUNMAZ — borç zaten kökte yazılı. Faz F bunu satır satır doğrulayacak.
 *
 * KAPSAM SONDASI — K23
 * Durum sırası sunucuda zorunlu mu? `pending`'ten doğrudan `delivered`'a
 * geçmeyi deniyoruz. Geçerse sıra yalnız arayüzde var demektir ve bir API
 * çağrısı sevk edilmemiş siparişi teslim edilmiş yapabilir.
 */
import { api, apiAs, rpc, kova, log, kontrol, bulgu } from './kopru.mjs';

/** Bir org'un owner kullanıcı kimliği — `p_salesperson_user_id` zorunlu. */
const satisciCache = new Map();
async function satisci(orgId) {
  if (satisciCache.has(orgId)) return satisciCache.get(orgId);
  const [u] = await api(`users?org_id=eq.${orgId}&org_role=eq.owner&select=id`);
  if (!u) throw new Error(`org ${orgId} için owner kullanıcı yok`);
  satisciCache.set(orgId, u.id);
  return u.id;
}

async function siparisVer(token, relationshipId, retailerOrgId, kalemler, musteri) {
  const r = await rpc(token, 'place_order_atomic', {
    p_relationship_id: relationshipId,
    p_items: kalemler,
    p_customer: musteri,
    p_salesperson_user_id: await satisci(retailerOrgId),
  });
  if (!r.ok) throw new Error(`place_order_atomic: ${r.mesaj}`);
  return r.veri;
}

const ilerlet = (token, id, durum, not = null) =>
  rpc(token, 'advance_order_status', { p_order_id: id, p_status: durum, p_note: not });

export async function fazD(ctx, jetonUye, PROFIL) {
  const { misafirUreticiler, misafirPerakendeciler, uyeUye, katalog } = ctx;
  log('\n=== FAZ D — sipariş yaşam döngüsü ===');

  const kayitlar = { tam: [], kismi: [], iptal: [], iade: [], ssh: [], finans: [], manuel: [] };

  /*
    Misafir üretici ↔ üye perakendeci hatları.
    Sipariş perakendeciden çıkar; misafir üreticinin onayı için MİSAFİR
    oturumu gerekir — ama misafir oturumu `app_metadata.sponsor_org_id`
    alanının üzerine yazdığı için eşzamanlı açılamaz. Bu yüzden üretici
    tarafındaki adımlar, misafir jetonu ile SERİ yürütülür.
  */
  const hatlar = [];
  for (const m of katalog.misafirKatalog) {
    for (const d of m.dilimler) hatlar.push({ misafir: m.misafir, dilim: d });
  }

  await kova(hatlar, 5, async ({ misafir, dilim }, idx) => {
    const tk = dilim.token;                 // üye perakendecinin jetonu
    const rel = dilim.sponsor.relationshipId;
    const rtl = dilim.sponsor.org.id;
    const musteri = { name: `Musteri ${idx}`, phone: '05550000000', province: 'Antalya' };

    // 1 — tam akış
    const o1 = await siparisVer(tk, rel, rtl, [
      { product_id: dilim.ortak, quantity: 2, retail_unit_price: 28000 },
      { product_id: dilim.ozel, quantity: 1, retail_unit_price: 9000, price_difference: 250,
        custom_description: 'Kapaklar cam olsun' },
    ], musteri);
    kayitlar.tam.push({ id: o1, rel, tk, misafir, dilim });

    // 2 — kısmi sevkiyat
    const o2 = await siparisVer(tk, rel, rtl, [
      { product_id: dilim.ortak, quantity: 4, retail_unit_price: 28000 },
    ], musteri);
    kayitlar.kismi.push({ id: o2, rel, tk, misafir, dilim });

    // 3 — iptal
    const o3 = await siparisVer(tk, rel, rtl, [
      { product_id: dilim.ozel, quantity: 1, retail_unit_price: 9000 },
    ], musteri);
    const ipt = await rpc(tk, 'cancel_order_atomic', { p_order_id: o3, p_reason: 'musteri vazgecti' });
    kayitlar.iptal.push({ id: o3, rel, ok: ipt.ok, mesaj: ipt.mesaj });
  });
  log(`  ${kayitlar.tam.length} tam + ${kayitlar.kismi.length} kısmi + ${kayitlar.iptal.length} iptal siparişi açıldı.`);

  /*
    ÜRETİCİ TARAFI — misafir oturumuyla, seri.
    Her misafir üretici, her sponsoru için ayrı ayrı giriş yapar. Bu, ürünün
    iş modelinin tam olarak kendisi: misafirin 3 sponsoru varsa 3 ayrı giriş.
  */
  const { misafirGiris } = await import('./kopru.mjs');
  let sevk = 0, kismiSevk = 0, teslim = 0;
  for (const m of katalog.misafirKatalog) {
    for (const d of m.dilimler) {
      const mtk = await misafirGiris('manufacturer', d.sponsor.org.vkn, m.misafir.vkn, 'test1234');
      const tam = kayitlar.tam.find((k) => k.dilim === d);
      const kis = kayitlar.kismi.find((k) => k.dilim === d);

      await ilerlet(mtk, tam.id, 'confirmed');
      await ilerlet(mtk, tam.id, 'in_production');
      const s1 = await rpc(mtk, 'ship_order_atomic', { p_order_id: tam.id, p_items: null, p_note: 'tamami sevk' });
      if (s1.ok) sevk++;
      const t1 = await ilerlet(tam.tk, tam.id, 'delivered');
      if (t1.ok) teslim++;

      await ilerlet(mtk, kis.id, 'confirmed');
      const kalem = await api(`order_items?order_id=eq.${kis.id}&select=id,quantity`);
      const s2 = await rpc(mtk, 'ship_order_atomic', {
        p_order_id: kis.id,
        p_items: [{ order_item_id: kalem[0].id, quantity: 2 }],
        p_note: 'yarisi sevk',
      });
      if (s2.ok) { kismiSevk++; kis.cocukId = s2.veri; }
      else kis.hata = s2.mesaj;

      d.misafirJeton = mtk;
    }
  }
  kontrol('Tam sevkiyat çalıştı', sevk === kayitlar.tam.length, `${sevk}/${kayitlar.tam.length}`);
  kontrol('Teslim adımı çalıştı', teslim === kayitlar.tam.length, `${teslim}/${kayitlar.tam.length}`);
  kontrol('Kısmi sevkiyat çalıştı', kismiSevk === kayitlar.kismi.length,
    `${kismiSevk}/${kayitlar.kismi.length}`);
  kontrol('İptaller çalıştı', kayitlar.iptal.every((i) => i.ok),
    `${kayitlar.iptal.filter((i) => i.ok).length}/${kayitlar.iptal.length}`);

  await ekAkislar(katalog, kayitlar);
  await k23Sondasi(katalog, kayitlar);
  await uyeUyeSiparisleri(ctx, jetonUye, kayitlar);

  return kayitlar;
}

/**
 * İade, SSH, finans ve manuel cari — ilk sponsor hattında.
 *
 * Bunlar ilişki başına değil, MODÜL başına anlam taşıyor: aynı kodu 300 kez
 * çalıştırmak yeni bilgi vermez. Kapsam ve izolasyon soruları Faz E'de
 * bütün hatlar üzerinde ayrıca taranıyor.
 */
async function ekAkislar(katalog, kayitlar) {
  log('\n  — iade / SSH / finans / manuel cari —');
  for (const m of katalog.misafirKatalog) {
    const d = m.dilimler[0];
    const tam = kayitlar.tam.find((k) => k.dilim === d);
    if (!tam) continue;

    const kalem = await api(`order_items?order_id=eq.${tam.id}&select=id,quantity,product_id`);

    // İADE — perakendeci açar, üretici onaylar.
    const iade = await rpc(d.token, 'create_return_request', {
      p_order_id: tam.id,
      p_items: [{ order_item_id: kalem[0].id, quantity: 1 }],
      p_reason: 'kumas hatasi',
    });
    if (iade.ok) {
      const onay = await rpc(d.misafirJeton, 'confirm_return_atomic', {
        p_return_id: iade.veri, p_approve: true, p_note: 'kabul',
      });
      kayitlar.iade.push({ id: iade.veri, orderId: tam.id, onay: onay.ok, mesaj: onay.mesaj });
    } else {
      kayitlar.iade.push({ orderId: tam.id, acilmadi: iade.mesaj });
    }

    // SSH — `ssh_requests` tablosunda INSERT politikası YOK; tek yol bu RPC.
    const ssh = await rpc(d.token, 'create_ssh_request', {
      p_relationship_id: d.sponsor.relationshipId,
      p_title: 'Mekanizma sesi', p_description: 'kanepe mekanizmasi ses yapiyor',
      p_order_id: tam.id, p_product_id: kalem[0].product_id, p_customer: {},
    });
    if (ssh.ok) {
      await rpc(d.misafirJeton, 'advance_ssh_status', { p_id: ssh.veri, p_status: 'inceleniyor', p_note: 'bakiliyor' });
      const bitir = await rpc(d.misafirJeton, 'advance_ssh_status', { p_id: ssh.veri, p_status: 'tamamlandi', p_note: 'degistirildi' });
      kayitlar.ssh.push({ id: ssh.veri, bitti: bitir.ok });
    } else {
      kayitlar.ssh.push({ acilmadi: ssh.mesaj });
    }

    // FİNANS — dört yöntem × iki tür.
    for (const yontem of ['cash', 'pos_own', 'pos_manufacturer', 'bank_transfer']) {
      for (const tur of ['income', 'expense']) {
        const f = await rpc(d.token, 'add_finance_transaction', {
          p_type: tur, p_method: yontem, p_amount: 1000,
          p_description: `${tur}/${yontem}`,
          p_order_id: tam.id, p_manufacturer_id: m.misafir.id,
        });
        kayitlar.finans.push({ yontem, tur, ok: f.ok, mesaj: f.mesaj });
      }
    }

    // MANUEL CARİ — talep + karar. Talebi açan taraf kendi kendini onaylayamamalı.
    const mt = await rpc(d.token, 'request_manual_transaction', {
      p_relationship_id: d.sponsor.relationshipId,
      p_type: 'credit', p_amount: 2500, p_description: 'elden odeme',
    });
    if (mt.ok) {
      const mod = mt.veri?.mode ?? mt.veri;
      const rid = mt.veri?.id;
      let karar = null;
      if (mod === 'pending' && rid) {
        karar = await rpc(d.misafirJeton, 'decide_manual_transaction', { p_request_id: rid, p_approve: true });
      }
      kayitlar.manuel.push({ mod, rid, karar: karar?.ok ?? null, mesaj: karar?.mesaj });
    } else {
      kayitlar.manuel.push({ acilmadi: mt.mesaj });
    }
  }

  kontrol('İadeler onaylandı', kayitlar.iade.every((i) => i.onay),
    `${kayitlar.iade.filter((i) => i.onay).length}/${kayitlar.iade.length}`);
  kontrol('SSH akışı tamamlandı', kayitlar.ssh.every((s) => s.bitti),
    `${kayitlar.ssh.filter((s) => s.bitti).length}/${kayitlar.ssh.length}`);
  kontrol('Finans hareketlerinin tamamı yazıldı', kayitlar.finans.every((f) => f.ok),
    `${kayitlar.finans.filter((f) => f.ok).length}/${kayitlar.finans.length}`);
  const ilkHata = kayitlar.finans.find((f) => !f.ok);
  if (ilkHata) log(`    ! ${ilkHata.tur}/${ilkHata.yontem}: ${ilkHata.mesaj.slice(0, 140)}`);
  kontrol('Manuel cari kararı işledi', kayitlar.manuel.every((m) => m.karar !== false),
    `${kayitlar.manuel.length} talep`);
}

/**
 * K23 — durum sırası sunucuda zorunlu mu?
 *
 * Bu sonda ayrı bir sipariş açar ve onu çöpe atar: kanıtlanırsa sipariş
 * gerçekten sevk edilmeden teslim edilmiş sayılacağı için, koşunun geri
 * kalanının verisine karıştırılmamalı.
 */
async function k23Sondasi(katalog, kayitlar) {
  const m = katalog.misafirKatalog[0];
  if (!m) return;
  const d = m.dilimler[0];
  const rtl = d.sponsor.org.id;
  const id = await siparisVer(d.token, d.sponsor.relationshipId, rtl,
    [{ product_id: d.ortak, quantity: 1 }], { name: 'K23 sonda' });

  /*
    Aktör PERAKENDECİ olmalı: `delivered` adımı zaten yalnız alıcı tarafın
    hakkı. Üretici jetonuyla denenirse dönen FORBIDDEN, sıranın zorunlu
    olduğunu değil rolün yanlış olduğunu gösterir — sonda soruyu kaçırır.
  */
  const r = await rpc(d.token, 'advance_order_status', {
    p_order_id: id, p_status: 'delivered', p_note: 'sira atlandi',
  });
  const [son] = await api(`orders?id=eq.${id}&select=status`);
  bulgu('K23', 'durum sırası sunucuda zorunlu değil',
    r.ok && son.status === 'delivered' ? 'kanitlandi' : 'curutuldu',
    r.ok && son.status === 'delivered'
      ? 'pending → delivered tek çağrıda geçti, sevkiyat hiç olmadı'
      : `reddedildi: ${r.mesaj.slice(0, 100)}`);
  kayitlar.k23OrderId = id;
}

/** Üye ↔ üye hattı: aynı yaşam döngüsü, iki tarafı da abone olan ilişkide. */
async function uyeUyeSiparisleri(ctx, jetonUye, kayitlar) {
  log('\n  — üye ↔ üye siparişleri —');
  const { uyeUye, katalog } = ctx;
  const urunHaritasi = new Map(katalog.uyeUrunler.map((x) => [x.org.id, x]));

  const sonuc = await kova(uyeUye, 5, async (s, i) => {
    const urun = urunHaritasi.get(s.u.id);
    if (!urun?.urunler?.length) return { atlandi: true };
    const ptk = await jetonUye(s.p);
    const utk = await jetonUye(s.u);
    const id = await siparisVer(ptk, s.relationshipId, s.p.id,
      [{ product_id: urun.urunler[0], quantity: 3, retail_unit_price: 12000 }],
      { name: `Uye Musteri ${i}` });
    await rpc(utk, 'advance_order_status', { p_order_id: id, p_status: 'confirmed' });
    await rpc(utk, 'advance_order_status', { p_order_id: id, p_status: 'in_production' });
    const sv = await rpc(utk, 'ship_order_atomic', { p_order_id: id, p_items: null, p_note: null });
    const ts = await rpc(ptk, 'advance_order_status', { p_order_id: id, p_status: 'delivered' });
    return { id, rel: s.relationshipId, sevk: sv.ok, teslim: ts.ok };
  });

  const gecerli = sonuc.filter((x) => !x.atlandi);
  kontrol('Üye ↔ üye siparişleri tamamlandı',
    gecerli.length > 0 && gecerli.every((x) => x.sevk && x.teslim),
    `${gecerli.filter((x) => x.sevk && x.teslim).length}/${gecerli.length}`);
  kayitlar.uyeUye = gecerli;
}
