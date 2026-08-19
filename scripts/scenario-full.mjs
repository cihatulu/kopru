/**
 * KÖPRÜ — tam ölçekli, üretim benzeri doğrulama koşusu.
 *
 * AMAÇ
 * Sistemin canlıdaki gibi davrandığını kanıtlamak: aynı misafiri birden çok
 * üye ekliyor, siparişler tam yaşam döngüsünden geçiyor, cari işliyor,
 * personel giriyor, misafirler üyeliğe geçince her şey tek panelde birleşiyor.
 *
 * TASARIM KARARI — neden gerçek oturum
 * Her yazma, gerçek bir kullanıcı jetonuyla ve gerçek RPC'den geçer. Service
 * role ile yazmak çok daha hızlı olurdu ama `auth.uid()` NULL kalır; birçok
 * RPC'nin yetki koşulu üç değerli mantık yüzünden sessizce geçer. O yolla
 * yapılan "test", test etmesi gereken kapıyı hiç çalmaz.
 *
 * BULGU POLİTİKASI
 * Bu koşu KOD DEĞİŞTİRMEZ. Keşifte çıkan K1–K36 kusur envanterini canlı
 * veriyle sınar ve her maddeyi kanıtlandı / çürütüldü / test-edilemedi
 * sonucuna bağlar. Düzeltmeler ayrı bir işin konusu.
 *
 * Kullanım:
 *   node scripts/scenario-full.mjs                 # tam ölçek + temizlik
 *   node scripts/scenario-full.mjs --kalsin        # veri dursun
 *   node scripts/scenario-full.mjs --olcek=kucuk   # duman testi (3/4)
 */
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  api, apiAs, rpc, rpcSR, say, log, kontrol, bulgu, bulgular, sayac,
  uyeGiris, misafirGiris, personelGiris, adminGiris, kova,
} from './lib/kopru.mjs';
import {
  fazA, fazB, uyeUyeIliskileri, SIFRE, SPONSOR_SAYISI,
  vknUyeUretici, vknUyePerakende,
} from './lib/kurulum.mjs';
import { fazC } from './lib/katalog.mjs';
import { fazD } from './lib/siparis.mjs';
import { fazE, fazF } from './lib/denetim.mjs';

const ADMIN_EMAIL = process.env.KOPRU_ADMIN_EMAIL ?? 'cih4tulu@gmail.com';
const ADMIN_PASS = process.env.KOPRU_ADMIN_PASSWORD ?? 'kopru2026test';

const argv = process.argv.slice(2);
const kalsin = argv.includes('--kalsin');
const olcek = (argv.find((a) => a.startsWith('--olcek='))?.split('=')[1]) ?? 'tam';

/**
 * Ölçek profilleri.
 *
 * `kucuk` profil, betiğin kendisini doğrulamak için: 300 org açıp 15
 * dakika bekledikten sonra bir alan adı yazım hatası bulmak istemiyoruz.
 */
const PROFIL = {
  kucuk: { uye: 3, misafir: 4, uyeUye: 3, siparis: 2, misafirOrnek: 2 },
  orta:  { uye: 10, misafir: 20, uyeUye: 10, siparis: 2, misafirOrnek: 4 },
  tam:   { uye: 50, misafir: 100, uyeUye: 50, siparis: 2, misafirOrnek: 10 },
}[olcek];
if (!PROFIL) { console.error(`Bilinmeyen ölçek: ${olcek}`); process.exit(1); }

const t0 = Date.now();
const sn = () => ((Date.now() - t0) / 1000).toFixed(0);

/** Üye org jetonu — portal, org'un kind'ından türer. */
const jetonUye = (o) => uyeGiris(o.kind, o.vkn, SIFRE);

async function main() {
  log(`\nKÖPRÜ doğrulama koşusu — ölçek: ${olcek}`);
  log(`  ${PROFIL.uye}+${PROFIL.uye} üye, ${PROFIL.misafir}+${PROFIL.misafir} misafir, ` +
      `misafir başına ${SPONSOR_SAYISI} sponsor\n`);

  const adminJeton = await adminGiris(ADMIN_EMAIL, ADMIN_PASS);
  log(`[${sn()}s] admin oturumu açıldı.`);

  const ctx = await fazA(PROFIL.uye);
  log(`[${sn()}s] Faz A bitti.`);

  const misafirler = await fazB(ctx, PROFIL.misafir, jetonUye);
  log(`[${sn()}s] Faz B bitti.`);

  const uyeUye = await uyeUyeIliskileri(ctx, jetonUye, PROFIL.uyeUye);
  log(`[${sn()}s] Faz B2 bitti.`);

  const katalog = await fazC({ ...ctx, ...misafirler, uyeUye }, jetonUye);
  log(`[${sn()}s] Faz C bitti.`);

  const siparis = await fazD({ ...ctx, ...misafirler, uyeUye, katalog }, jetonUye, PROFIL);
  log(`[${sn()}s] Faz D bitti.`);

  const durum = { ...ctx, ...misafirler, uyeUye, katalog, siparis, adminJeton, PROFIL };

  await fazE(durum, jetonUye);
  log(`[${sn()}s] Faz E (kapsam ve yetki denetimi) bitti.`);

  await fazF(durum, jetonUye);
  log(`[${sn()}s] Faz F (birleştirme ve cari denetimi) bitti.`);

  return durum;
}

let basarili = false;
try {
  await main();
  basarili = true;
} catch (e) {
  log(`\n!!! KOŞU PATLADI: ${e.message}\n${e.stack?.split('\n').slice(1, 4).join('\n') ?? ''}`);
}

const { gecen, kalan } = sayac();
log(`\n${'─'.repeat(64)}`);
log(`Kontroller: ${gecen} geçti, ${kalan} kaldı. Süre: ${sn()}s`);
const kanit = bulgular.filter((b) => b.sonuc === 'kanitlandi');
const curuk = bulgular.filter((b) => b.sonuc === 'curutuldu');
const olcum = bulgular.filter((b) => b.sonuc === 'test-edilemedi');
log(`Kusur envanteri: ${kanit.length} kanıtlandı, ${curuk.length} çürütüldü, ${olcum.length} test edilemedi.`);

writeFileSync(
  'scripts/.son-kosu.json',
  JSON.stringify({ olcek, gecen, kalan, saniye: Number(sn()), bulgular }, null, 2),
);
log('Ham sonuç: scripts/.son-kosu.json');

/*
  TEMİZLİK — yalnız koşu sağlam bittiyse.
  Patlayan bir koşunun verisi kanıttır; silmek incelemeyi imkânsız kılar.
*/
if (!basarili) {
  log('\nKoşu tamamlanamadı — veri İNCELEME İÇİN bırakıldı.');
  log('Elle temizlik: node scripts/wipe.mjs --onayla\n');
  process.exit(1);
} else if (kalsin) {
  log('\n--kalsin verildi: veri duruyor. Panellerden bakabilirsin.');
  log(`Giriş: üye kod=VKN (${vknUyeUretici(1)} / ${vknUyePerakende(1)}), şifre=${SIFRE}`);
  log('Temizlik: node scripts/wipe.mjs --onayla\n');
} else {
  log('\nTemizleniyor...');
  execFileSync('node', ['scripts/wipe.mjs', '--onayla'], { stdio: 'inherit' });
}
process.exit(kalan === 0 ? 0 : 1);
