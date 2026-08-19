/**
 * KÖPRÜ — doğrulama koşusu, Faz C: kataloglar.
 *
 * İKİ AYRI KATALOG YOLU VAR, İKİSİ DE SINANIYOR
 *
 * 1. ÜYE ÜRETİCİ kendi kataloğunu yazar — klasik yol.
 * 2. ÜYE PERAKENDECİ, misafir üreticinin kataloğunu ONUN ADINA yazar
 *    (`p_owner_org_id`). Bugünkü işin konusu buydu: aynı misafir üreticiyi
 *    üç ayrı perakendeci besliyor ve hiçbiri diğerinin ürününü görmemeli.
 *
 * ORTAK ADLI ÜRÜN
 * Her perakendeci misafir üreticinin kataloğuna AYNI ADLI bir ürünü farklı
 * fiyatla giriyor. Üyeliğe geçişte bunlar teke inecek, en eskisinin fiyatı
 * kalacak ve üreticiye "fiyatları kontrol et" uyarısı düşecek. Ad birebir
 * eşleşme kuralı bilinçli: "Alanya Köşe" ile "Alanya Köşe Takımı" AYRI kalır.
 */
import { api, apiAs, rpc, kova, log, kontrol, bulgu } from './kopru.mjs';

export const ORTAK_AD = 'ORTAK KOLTUK TAKIMI';

/** En eski kaydın fiyatı hayatta kalacak; ilk sponsorunki en düşük olsun ki fark görünsün. */
const ortakFiyat = (s) => 10000 + s * 2500;

async function urunYaz(token, arg) {
  const r = await rpc(token, 'save_product', arg);
  if (!r.ok) throw new Error(`save_product [${arg.p_name}]: ${r.mesaj}`);
  return r.veri;
}

export async function fazC(ctx, jetonUye) {
  const { ureticiler, misafirUreticiler, uyeUye } = ctx;
  log('\n=== FAZ C — kataloglar ===');

  // ── 1. Üye üreticilerin kendi katalogları (üye ↔ üye siparişleri için)
  const uyeUrunler = await kova(ureticiler, 6, async (u, i) => {
    const tk = await jetonUye(u);
    const grup = await rpc(tk, 'save_product_group', { p_name: `SERI ${i + 1}`, p_sort_order: i });
    const idler = [];
    for (let k = 1; k <= 2; k++) {
      idler.push(await urunYaz(tk, {
        p_name: `UYE URUN ${i + 1}-${k}`, p_code: `UU${i + 1}K${k}`,
        p_supplier_price: 5000 + k * 1000, p_cost_price: 3000 + k * 500,
        p_group_id: grup.ok ? grup.veri : null, p_stock: 100,
      }));
    }
    return { org: u, grupId: grup.ok ? grup.veri : null, urunler: idler };
  });
  log(`  ${uyeUrunler.length} üye üretici × 2 ürün yazıldı.`);

  // ── 2. Misafir üreticilerin katalogları — her sponsor perakendeci ayrı ayrı
  const misafirKatalog = await kova(misafirUreticiler, 5, async (m) => {
    const dilimler = [];
    for (let s = 0; s < m.sponsorlar.length; s++) {
      const sp = m.sponsorlar[s];
      const tk = await jetonUye(sp.org);
      const grup = await rpc(tk, 'save_product_group', {
        p_name: `${sp.org.vkn.slice(-3)} SERISI`, p_sort_order: s, p_owner_org_id: m.id,
      });
      /*
        Açıklama, görsel ve ölçüler BİLEREK dolduruluyor. Birleştirmede
        hayatta kalmayan kopyanın bu alanları sessizce gidiyor mu (K9, K10)
        sorusu ancak bunlar doluysa ölçülebilir; boş ürünle "kayıp yok"
        demek, ölçmemiş olmakla aynı şey.
      */
      const ortak = await urunYaz(tk, {
        p_name: ORTAK_AD, p_code: `ORT-${m.vkn.slice(-4)}-${s}`,
        p_supplier_price: ortakFiyat(s), p_cost_price: 6000 + s * 500,
        p_group_id: grup.ok ? grup.veri : null, p_owner_org_id: m.id, p_stock: 20,
        p_description: `${sp.org.vkn} tarafindan girilen aciklama ${s}`,
        p_images: [`urunler/${m.vkn}/ortak-${s}.jpg`],
        p_width: 220 + s, p_depth: 90, p_height: 85,
      });
      const ozel = await urunYaz(tk, {
        p_name: `OZEL ${sp.org.vkn.slice(-3)} / ${m.vkn.slice(-3)}`,
        p_code: `OZL-${m.vkn.slice(-4)}-${s}`,
        p_supplier_price: 4000 + s * 100, p_cost_price: 2500,
        p_group_id: grup.ok ? grup.veri : null, p_owner_org_id: m.id, p_stock: 15,
      });

      /*
        KATMAN 3 — perakendecinin kendi satış fiyatı.
        Ayrı tabloda tutuluyor çünkü RLS kolon düzeyinde koruma vermez.
        Birleştirmede bunların kaç tanesinin sessizce kaybolduğunu Faz F
        ölçecek (K8).
      */
      for (const pid of [ortak, ozel]) {
        await apiAs(tk, 'retail_prices', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify({
            retailer_org_id: sp.org.id, product_id: pid,
            retail_price: 25000 + s * 1000,
          }),
        });
      }

      dilimler.push({ sponsor: sp, grupId: grup.ok ? grup.veri : null, ortak, ozel, token: tk });
    }
    return { misafir: m, dilimler };
  });
  const urunSayisi = misafirKatalog.reduce((t, k) => t + k.dilimler.length * 2, 0);
  log(`  ${misafirKatalog.length} misafir üretici × ${misafirUreticiler[0].sponsorlar.length} sponsor × 2 ürün = ${urunSayisi} ürün.`);

  await kapsamSizintilari(misafirKatalog);
  await excelYolu(misafirKatalog);

  return { uyeUrunler, misafirKatalog };
}

/**
 * K1 / K2 / K3 / K5 — kapsam sızıntısı sondaları.
 *
 * Hepsi aynı soruyu soruyor: perakendeci B, misafir üreticinin kataloğunda
 * perakendeci A'nın yazdığı satıra dokunabiliyor mu? Dokunabiliyorsa
 * bugünkü kapsam işi eksik demektir.
 *
 * K2 SONDASI YIKICI — `set_group_products` listede olmayan her ürünün
 * `group_id`'sini null'lıyor. Bu yüzden yalnız SON misafir üretici üzerinde
 * çalıştırılıyor; geri kalan veri temiz kalsın ki sonraki fazlar güvenilir olsun.
 */
async function kapsamSizintilari(misafirKatalog) {
  log('\n  — kapsam sızıntısı sondaları —');
  const cokSponsorlu = misafirKatalog.filter((k) => k.dilimler.length >= 2);
  if (!cokSponsorlu.length) { log('    (çok sponsorlu misafir yok, atlandı)'); return; }

  const ornek = cokSponsorlu[0];
  const [A, B] = ornek.dilimler;

  // K1 — B, A'nın ürününü kendi grubuna taşıyabiliyor mu?
  const k1 = await rpc(B.token, 'assign_products_to_group', {
    p_product_ids: [A.ozel], p_group_id: B.grupId, p_owner_org_id: ornek.misafir.id,
  });
  const [k1Sonra] = await api(`products?id=eq.${A.ozel}&select=group_id`);
  bulgu('K1', 'assign_products_to_group kapsamsız',
    k1.ok && k1Sonra.group_id === B.grupId ? 'kanitlandi' : 'curutuldu',
    k1.ok ? `A'nın ürünü B'nin grubuna taşındı (dönen adet: ${k1.veri})`
          : `RPC reddetti: ${k1.mesaj.slice(0, 80)}`);
  if (k1.ok && k1Sonra.group_id === B.grupId) {
    await api(`products?id=eq.${A.ozel}`, { method: 'PATCH', body: JSON.stringify({ group_id: A.grupId }) });
  }

  // K3 — B, misafir üreticinin TÜM maliyetlerini görebiliyor mu? (katman-1 deliği)
  const gizli = await apiAs(B.token, `product_costs?product_id=eq.${A.ozel}&select=product_id,cost_price`)
    .catch(() => []);
  bulgu('K3', 'product_costs kapsamsız — katman-1 fiyat izolasyonu',
    gizli.length > 0 ? 'kanitlandi' : 'curutuldu',
    gizli.length > 0 ? `B, A'nın ürününün maliyetini okudu: ₺${gizli[0].cost_price}`
                     : 'RLS engelledi');

  // K5 — B, A'nın ürününün üretici stoğunu görebiliyor mu?
  const stok = await apiAs(B.token, `manufacturer_stock?product_id=eq.${A.ozel}&select=product_id,quantity`)
    .catch(() => []);
  bulgu('K5', 'manufacturer_stock dealer select kapsamsız',
    stok.length > 0 ? 'kanitlandi' : 'curutuldu',
    stok.length > 0 ? `B, A'nın ürününün adedini gördü: ${stok[0].quantity}` : 'RLS engelledi');

  // K2 — YIKICI sonda, ayrılmış kurban üzerinde.
  const kurban = cokSponsorlu[cokSponsorlu.length - 1];
  if (kurban !== ornek || cokSponsorlu.length === 1) {
    const [X, Y] = kurban.dilimler;
    const oncekiler = await api(
      `products?owner_org_id=eq.${kurban.misafir.id}&group_id=eq.${X.grupId}&select=id`);
    const k2 = await rpc(Y.token, 'set_group_products', {
      p_group_id: X.grupId, p_product_ids: [Y.ozel], p_owner_org_id: kurban.misafir.id,
    });
    const sonrakiler = await api(
      `products?owner_org_id=eq.${kurban.misafir.id}&group_id=eq.${X.grupId}&select=id`);
    const kayip = oncekiler.filter((p) => !sonrakiler.some((q) => q.id === p.id));
    bulgu('K2', 'set_group_products kapsamsız ve YIKICI',
      k2.ok && kayip.length > 0 ? 'kanitlandi' : k2.ok ? 'curutuldu' : 'curutuldu',
      k2.ok ? `B'nin çağrısı A'nın ${kayip.length} ürününü gruptan düşürdü`
            : `RPC reddetti: ${k2.mesaj.slice(0, 80)}`);
    kurban.k2Bozuldu = k2.ok && kayip.length > 0;
  } else {
    bulgu('K2', 'set_group_products kapsamsız ve YIKICI', 'test-edilemedi',
      'ayrı kurban misafir kalmadı (ölçeği büyüt)');
  }
}

/**
 * K4 — Excel yolundan doğan ürün kapsamsız mı doğuyor?
 *
 * `bulk_update_retailer_stock` tanımadığı satır için yeni ürün açıyor.
 * O ürün `managed_by_retailer_org_id` almazsa, aynı misafir üreticiyi
 * besleyen bütün perakendeciler onu görür — kapsam kuralı ilk gün delinir.
 */
async function excelYolu(misafirKatalog) {
  log('\n  — Excel (toplu stok) yolu —');
  const hedef = misafirKatalog[0];
  if (!hedef) return;
  const dilim = hedef.dilimler[0];

  const r = await rpc(dilim.token, 'bulk_update_retailer_stock', {
    p_rows: [{ name: 'EXCELDEN DOGAN URUN', code: 'XLS-001', quantity: 7, supplier_price: 3300 }],
    p_manufacturer_org_id: hedef.misafir.id,
  });
  if (!r.ok) {
    bulgu('K4', 'bulk_update_retailer_stock kapsam yazmıyor', 'test-edilemedi',
      `RPC hata verdi: ${r.mesaj.slice(0, 120)}`);
    return;
  }
  const [yeni] = await api(
    `products?owner_org_id=eq.${hedef.misafir.id}&code=eq.XLS-001&select=id,managed_by_retailer_org_id`);
  if (!yeni) {
    bulgu('K4', 'bulk_update_retailer_stock kapsam yazmıyor', 'test-edilemedi',
      'RPC ürün açmadı — sonuç: ' + JSON.stringify(r.veri).slice(0, 120));
    return;
  }
  bulgu('K4', 'Excel\'den doğan ürün KAPSAMSIZ doğuyor',
    yeni.managed_by_retailer_org_id === null ? 'kanitlandi' : 'curutuldu',
    yeni.managed_by_retailer_org_id === null
      ? 'managed_by_retailer_org_id null — tüm sponsorlar görecek'
      : 'kapsam doğru yazıldı');

  // K29 — tanınmayan uuid sessizce yeni ürün mü açıyor?
  const sahte = '00000000-0000-4000-8000-000000000001';
  const oncekiSayi = (await api(`products?owner_org_id=eq.${hedef.misafir.id}&select=id`)).length;
  const r2 = await rpc(dilim.token, 'bulk_update_retailer_stock', {
    p_rows: [{ id: sahte, name: 'HAYALET SATIR', code: 'XLS-GHOST', quantity: 3 }],
    p_manufacturer_org_id: hedef.misafir.id,
  });
  const sonrakiSayi = (await api(`products?owner_org_id=eq.${hedef.misafir.id}&select=id`)).length;
  bulgu('K29', 'tanınmayan uuid sessizce yeni ürün açıyor',
    r2.ok && sonrakiSayi > oncekiSayi ? 'kanitlandi' : 'curutuldu',
    r2.ok ? `ürün sayısı ${oncekiSayi} → ${sonrakiSayi}` : `RPC reddetti: ${r2.mesaj.slice(0, 80)}`);
}
