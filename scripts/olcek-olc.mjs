/**
 * KÖPRÜ — Faz G: ölçek ölçümü.
 *
 * NE ÖLÇÜYOR
 * Hedef ölçek ~5.000 üretici, ~50.000 perakendeci, ~500.000 ilişki, yılda
 * ~5M sipariş (PLAN §17). Bu koşudaki veri onun binde biri; dolayısıyla
 * burada aranan şey "yavaş mı" değil, **plan şekli**: index kullanılıyor mu,
 * seq scan var mı, sayaçlar `count(*)` ile mi hesaplanıyor.
 *
 * Bir sorgu 300 org'da 4 ms sürüyor ama seq scan yapıyorsa, 50.000 org'da
 * 4 ms sürmeyecek — ölçüm süreye değil plana bakmalı.
 *
 * NEDEN AYRI BETİK
 * `EXPLAIN ANALYZE` yalnız okuma yapar ama senaryo betiğinin akışına
 * karışmaması gerekir: ölçüm, veri son hâline geldikten SONRA anlamlıdır.
 *
 * Kullanım: node scripts/olcek-olc.mjs
 */
import { rpcSR, api, log } from './lib/kopru.mjs';

/**
 * Duvar saati: aynı sorguyu üç kez koşup ortancayı alır.
 *
 * Süre tek başına yanıltıcıdır — 300 org'da her şey hızlıdır. Asıl soru
 * PLAN ŞEKLİ: seq scan mı, index scan mi. Planlar `EXPLAIN (analyze,
 * buffers)` ile ayrıca okunuyor ve rapora oradan giriyor; bu betik yalnız
 * uçtan uca gecikmeyi (RLS + PostgREST + ağ dahil) ölçer.
 */
async function sure(etiket, calistir) {
  const olcumler = [];
  for (let i = 0; i < 3; i++) {
    const t = process.hrtime.bigint();
    await calistir();
    olcumler.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  olcumler.sort((a, b) => a - b);
  const ms = olcumler[1].toFixed(0);
  log(`  ${etiket.padEnd(52)} ${ms} ms`);
  return Number(ms);
}

log('\n=== FAZ G — ölçek ölçümü ===');

const [{ count: orgSayisi }] = [{ count: (await api('organizations?select=id')).length }];
const iliskiler = (await api('relationships?select=id&limit=2000')).length;
log(`  Veri: ${orgSayisi} org, ${iliskiler} ilişki.\n`);

const sonuc = {};

// ── K31: dashboard_summary COUNT(*) ile mi çalışıyor?
sonuc.dashboard = await sure('dashboard_summary() [service role]',
  () => rpcSR('dashboard_summary', {}));

// ── K32: raporların tarihsiz/limitsiz sorguları
sonuc.raporSiparis = await sure('orders — tarihsiz, limitsiz (rapor deseni)',
  () => api('orders?select=id,total_amount,status,created_at'));
sonuc.raporKalem = await sure('order_items — tarihsiz, limitsiz',
  () => api('order_items?select=id,quantity,supplier_unit_price'));

// ── A19: keyset sayfalama gerçekten keyset mi?
const [ilk] = await api('orders?select=id&order=id.asc&limit=1');
sonuc.keyset = await sure('orders — keyset sayfa (id > ?, limit 50)',
  () => api(`orders?select=id,order_no,total_amount&id=gt.${ilk.id}&order=id.asc&limit=50`));
sonuc.offset = await sure('orders — OFFSET 1000 (A19 ile YASAK, kıyas için)',
  () => api('orders?select=id,order_no&order=id.asc&limit=50&offset=1000'));

// ── Cari listesi: kilitli kural 9'un denormalize eşitliği
const [org] = await api('organizations?kind=eq.retailer&select=id&limit=1');
sonuc.cari = await sure('transactions — denormalize eşitlik + keyset',
  () => api(`transactions?retailer_org_id=eq.${org.id}&select=id,amount,balance_after&order=created_at.desc,id.desc&limit=50`));

// ── K35: order_sequences satır kilidi
const kilit = await api('order_sequences?select=manufacturer_org_id,day,last_no&order=last_no.desc&limit=5');
log(`\n  order_sequences en yoğun satırlar: ${kilit.map((k) => k.last_no).join(', ')}`);
log('  (aynı üreticiye eşzamanlı sipariş, bu satırın kilidinde serileşir — K35)');

// ── K33: stok listelerindeki sabit tavan
const stokSayisi = (await api('retailer_stock?select=product_id&limit=2000')).length;
log(`\n  retailer_stock satır sayısı: ${stokSayisi} (arayüzde sabit .limit(500) tavanı var — K33)`);

log('\n  NOT: buradaki sayılar uçtan uca gecikmedir (RLS + PostgREST + ağ dahil).');
log('  Sorgu planları `EXPLAIN (analyze, buffers)` ile ayrıca okundu; rapordaki');
log('  seq-scan/index-scan yargıları oradan gelir, bu sürelerden değil.');

console.log('\n' + JSON.stringify(sonuc, null, 2));
