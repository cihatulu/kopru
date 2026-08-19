/**
 * KÖPRÜ — Faz F'nin tamamlanamayan son adımları, mevcut veri üzerinde.
 *
 * NEDEN AYRI BETİK
 * Tam ölçekli koşu, birleştirme denetiminin son adımında bir URL uzunluğu
 * sınırına takıldı: 100 misafir üreticinin ~1000 siparişinin kimliği tek bir
 * `in.()` içine konunca istek sunucuya hiç varmadı. Sınır yalnız tam ölçekte
 * görünüyor — küçük ölçekte 12 kimlik vardı.
 *
 * Betik `scripts/lib/birlesme.mjs` içinde kalıcı olarak düzeltildi (parçalı
 * sorgu). Bu dosya, 24 dakikalık koşuyu yeniden başlatmadan kalan üç
 * denetimi AYNI veri üzerinde tamamlar:
 *   · birleştirme geçmişi bozdu mu (order_items / ssh_requests ürün bağı)
 *   · K25 — üyelikten geri düşürme kapsamı geri kuruyor mu
 *   · K11 doğrulaması — ölü grupların gerçekten boş olduğu
 *
 * K26 (bayat JWT) burada ölçülemez: kanıtı, üyeliğe geçişten ÖNCE alınmış
 * bir misafir jetonuydu ve o jeton koşuyla birlikte gitti. Küçük ölçekli
 * koşuda ölçüldü ve çürütüldü.
 */
import { api, rpc, adminGiris, log, kontrol, bulgu, sayac } from './lib/kopru.mjs';

const ADMIN_EMAIL = process.env.KOPRU_ADMIN_EMAIL ?? 'cih4tulu@gmail.com';
const ADMIN_PASS = process.env.KOPRU_ADMIN_PASSWORD ?? 'kopru2026test';

async function parcali(idler, sorgu, parca = 60) {
  const cikti = [];
  for (let i = 0; i < idler.length; i += parca) {
    cikti.push(...await api(sorgu(idler.slice(i, i + parca))));
  }
  return cikti;
}

log('\n=== FAZ F (kalan) — birleştirme sonrası bütünlük ===');

// Misafir üreticiler: `482` önekli VKN'ler.
const misafirler = await api('organizations?vkn_tc=like.482*&select=id,vkn_tc,is_subscriber');
log(`  ${misafirler.length} misafir üretici (hepsi üye oldu: ${misafirler.every((m) => m.is_subscriber)}).`);
const idler = misafirler.map((m) => m.id);

// ── Geçmiş bozuldu mu?
const siparisler = await parcali(idler,
  (d) => `orders?manufacturer_org_id=in.(${d.join(',')})&select=id&limit=2000`);
const kalemler = await parcali(siparisler.map((o) => o.id),
  (d) => `order_items?select=id,product_id&order_id=in.(${d.join(',')})&limit=5000`);
const kopuk = kalemler.filter((k) => k.product_id === null);
kontrol('Sipariş kalemlerinin ürün bağı kopmadı', kopuk.length === 0,
  `${kopuk.length}/${kalemler.length} kopuk`);

// Kalemler HAYATTA KALAN ürünü mü gösteriyor?
const urunler = await parcali(idler,
  (d) => `products?owner_org_id=in.(${d.join(',')})&select=id&limit=5000`);
const canli = new Set(urunler.map((u) => u.id));
const yetim = kalemler.filter((k) => k.product_id && !canli.has(k.product_id));
kontrol('Kalemler hayatta kalan ürünü gösteriyor', yetim.length === 0,
  `${yetim.length}/${kalemler.length} yetim`);

const ssh = await parcali(idler,
  (d) => `ssh_requests?manufacturer_org_id=in.(${d.join(',')})&select=id,product_id`);
kontrol('SSH ürün bağı kopmadı', ssh.every((s) => s.product_id !== null),
  `${ssh.filter((s) => s.product_id === null).length}/${ssh.length} kopuk`);

// ── K11 doğrulaması: ölü gruplar gerçekten boş mu?
const gruplar = await parcali(idler,
  (d) => `product_groups?owner_org_id=in.(${d.join(',')})&select=id,name,owner_org_id&limit=5000`);
const urunGrup = await parcali(idler,
  (d) => `products?owner_org_id=in.(${d.join(',')})&select=id,group_id&limit=5000`);
const doluGruplar = new Set(urunGrup.map((u) => u.group_id).filter(Boolean));
const bos = gruplar.filter((g) => !doluGruplar.has(g.id));
bulgu('K11', 'boşalan gruplar ölü düğüm olarak kalıyor',
  bos.length > 0 ? 'kanitlandi' : 'curutuldu',
  `${bos.length}/${gruplar.length} grup boş — üretici panelinde tıklanabilir ama içi yok`);

// ── K25: üyelikten geri düşürme
const jeton = await adminGiris(ADMIN_EMAIL, ADMIN_PASS);
const kurban = misafirler[misafirler.length - 1];
const r = await rpc(jeton, 'downgrade_org_to_guest', { p_org_id: kurban.id });
if (!r.ok) {
  bulgu('K25', 'downgrade_org_to_guest kapsamı geri kurmuyor', 'test-edilemedi',
    `RPC çağrılamadı: ${r.mesaj.slice(0, 140)}`);
} else {
  const u = await api(`products?owner_org_id=eq.${kurban.id}&select=id,managed_by_retailer_org_id`);
  const kapsamsiz = u.filter((x) => x.managed_by_retailer_org_id === null).length;
  const [org] = await api(`organizations?id=eq.${kurban.id}&select=is_subscriber`);
  bulgu('K25', 'downgrade_org_to_guest kapsamı geri kurmuyor',
    u.length > 0 && kapsamsiz === u.length ? 'kanitlandi' : 'curutuldu',
    `org misafire döndü (is_subscriber=${org.is_subscriber}) ama ${kapsamsiz}/${u.length} ürün ` +
    'hâlâ kapsamsız: her sponsor perakendeci diğerlerinin ürünlerini görmeye devam eder');
}

const { gecen, kalan } = sayac();
log(`\nKontroller: ${gecen} geçti, ${kalan} kaldı.\n`);
