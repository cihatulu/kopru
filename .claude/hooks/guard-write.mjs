// PreToolUse (Write|Edit) — tüm yazım kurallarını TEK process'te zorlar.
//
// Plan §13.3/§18.4 ayrı hook dosyaları öngörüyordu; her hook ayrı bir Node process
// demek olduğu için 11 kural burada adlandırılmış kontrol fonksiyonlarında toplandı.
// Davranış aynı, maliyet 1/6.
import { readInput, block, allow, norm, stripComments } from './_util.mjs';

const input = await readInput();
const ti = input?.tool_input || {};
const path = norm(ti.file_path);
if (!path) allow();

// Edit'te yeni içerik new_string, Write'ta content.
const raw = ti.content ?? ti.new_string ?? '';
const code = stripComments(raw);

const isTs = /\.tsx?$/.test(path);
const isSql = /\.sql$/.test(path);
const isTest = /\.test\.tsx?$/.test(path);
const isDoc = /\.(md|json|txt)$/.test(path);
// Harness'ın kendi dosyaları ve plan/doküman metinleri kural metni içerdiği için muaf.
const isHarness = /\/\.claude\//.test(path) || /\/(PLAN|CLAUDE|NOTES)\.md$/i.test(path);

if (isHarness || isDoc) allow();

// ---------------------------------------------------------------- kural 11
function checkSingleConstants() {
  if (/\/src\/constants\//.test(path) && !/\/src\/constants\/index\.ts$/.test(path)) {
    block(
      'BLOK (kilitli kural 11): Tek `src/constants/index.ts` olmalı.\n' +
        'Sabiti oraya ekle; ikinci constants dosyası açılmaz.',
    );
  }
}

// ---------------------------------------------------------------- kural 10
function checkAppIsRouterOnly() {
  if (!/\/src\/App\.tsx$/.test(path)) return;
  if (
    /\buse(Query|Mutation|State|Effect|Reducer)\b/.test(code) ||
    /\bsupabase\s*\./.test(code) ||
    /from\s+['"][^'"]*\/(features|store|services)\//.test(code)
  ) {
    block(
      'BLOK (kilitli kural 10): App.tsx yalnız router.\n' +
        'İş mantığı/state/veri çekme ilgili sayfa veya feature dosyasına taşınır.',
    );
  }
}

// ---------------------------------------------------------------- kural 2
function checkNoPasswordStorage() {
  if (/password_hash|passwordHash/.test(code)) {
    block(
      'BLOK (kilitli kural 2): `password_hash` bu projede YOK.\n' +
        'Tüm şifre işlemleri yalnız `update-user-password` Edge Function üzerinden (auth.admin.*).',
    );
  }
  if (isTs && /supabase\.auth\.(signUp|admin\.)/.test(code) && !/supabase\/functions\//.test(path)) {
    block(
      'BLOK (kilitli kural 2/3): Auth yazma işlemleri istemciden çağrılmaz.\n' +
        'Giriş → `login`, şifre → `update-user-password` Edge Function.',
    );
  }
}

// ---------------------------------------------------------------- kural 4
function checkMigrationStandards() {
  if (!isSql || !/\/supabase\/migrations\//.test(path)) return;

  if (/\bauth\.uid\(\)/.test(code) && !/\(\s*select\s+auth\.uid\(\)\s*\)/i.test(code)) {
    block(
      'BLOK (kilitli kural 4): RLS politikasında düz `auth.uid()` kullanılamaz.\n' +
        '`(select auth.uid())` ile sar — aksi halde satır başına yeniden değerlendirilir (auth_rls_initplan).',
    );
  }
  if (/create\s+(or\s+replace\s+)?view/i.test(code) && !/security_invoker\s*=\s*true/i.test(code)) {
    block(
      'BLOK (kilitli kural 4): Tüm view\'lar `WITH (security_invoker = true)` ile tanımlanır.',
    );
  }
  if (
    /create\s+(or\s+replace\s+)?function/i.test(code) &&
    !/set\s+search_path\s*=\s*public/i.test(code)
  ) {
    block(
      'BLOK (kilitli kural 4): Tüm fonksiyonlar `SET search_path = public` içermelidir.',
    );
  }
  if (/create\s+table/i.test(code) && !/enable\s+row\s+level\s+security/i.test(code)) {
    block(
      'BLOK (kilitli kural 4): Yeni tablo RLS açılmadan oluşturulamaz.\n' +
        '`alter table <ad> enable row level security;` ekle.',
    );
  }
}

// ---------------------------------------------------------------- kural 5 / A4
function checkPriceLeak() {
  if (isSql) {
    // İfade bazlı analiz. Gevşek "yakınlık" regex'i `product_costs` içindeki
    // `references public.products(id)` satırını yanlışlıkla bloklardı.
    const FORBIDDEN = [
      ['products', /\b(cost_price|retail_price)\b/i, 'product_costs / retail_prices'],
      ['order_items', /\b(retail_unit_price|cost_price)\b/i, 'order_item_retail_prices'],
    ];

    for (const stmt of code.split(';')) {
      const target = /\b(?:create|alter)\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/i.exec(
        stmt,
      );
      if (!target) continue;
      for (const [table, badCol, where] of FORBIDDEN) {
        if (target[1].toLowerCase() !== table) continue;
        const hit = badCol.exec(stmt);
        if (hit) {
          block(
            `BLOK (kilitli kural 5 / A4): \`${table}\` tablosuna \`${hit[1]}\` eklenemez.\n` +
              `O fiyat ayrı \`${where}\` tablosunda yaşar — Postgres RLS kolon düzeyinde korumaz,\n` +
              'ayrı tablo sızıntıyı yapısal olarak imkânsız kılar.',
          );
        }
      }
    }
  }
  if (isTs) {
    // Zincir bazlı analiz: yasak olan `cost_price`'ı PRODUCTS tablosundan seçmek.
    // Aynı dosyanın hem `products` hem `product_costs` sorgulaması meşrudur —
    // dosya genelinde birlikte geçmelerine bakmak yanlış pozitif üretiyordu.
    for (const seg of code.split(/\.from\(/).slice(1)) {
      const table = /^\s*['"`](\w+)['"`]\s*\)/.exec(seg)?.[1];
      if (table !== 'products') continue;
      // Bu zincirin sonu: bir sonraki `.from(` zaten ayrılmış durumda.
      const chain = seg.split(/;\s*\n/)[0] ?? seg;
      const bad = /\b(cost_price|retail_price)\b/.exec(chain);
      if (bad) {
        block(
          `BLOK (A4): \`products\` sorgusunda \`${bad[1]}\` seçilemez — o kolon o tabloda yok.\n` +
            'Üretici maliyeti `product_costs`, perakendeci fiyatı `retail_prices` tablosundadır.',
        );
      }
    }
    if (/\{\s*\.\.\.\s*(order|product|item)\b/.test(code) && /snapshot/i.test(code)) {
      block(
        'BLOK (kilitli kural 5): Snapshot spread ile üretilemez — gizli alan sızar.\n' +
          '`features/orders/domain/snapshot.ts` içindeki allowlist serializer\'ı kullan.',
      );
    }
  }
}

// ---------------------------------------------------------------- köprü kalıntısı
function checkBridgeResidue() {
  if (!isTs && !isSql) return;
  const hit = /\b(bridge_\w+|is_shadow|pairing_code|outbound_secret|bridge_sync_log|integrationBridge|X-Bridge-Signature)\b/i.exec(
    code,
  );
  if (hit) {
    block(
      `BLOK (köprü kalıntısı): \`${hit[0]}\` bu kod tabanında yoktur.\n` +
        'İki eski SaaS arasındaki köprü kaldırıldı; tek DB, tek uygulama.\n' +
        'Misafir taraf `organizations.is_subscriber=false` olan normal bir org satırıdır.',
    );
  }
}

// ---------------------------------------------------------------- A19
const BUDGETS = [
  [/\/src\/pages\/.*\.tsx$/, 150, 'sayfa (yalnız kompozisyon olmalı)'],
  [/\/src\/features\/[^/]+\/api\/.*\.ts$/, 150, 'api dosyası (sorgu başına dosya)'],
  [/\/src\/features\/[^/]+\/domain\/.*\.ts$/, 200, 'domain dosyası (sorumluluk başına dosya)'],
  [/\/src\/(components|features)\/.*\.tsx$/, 200, 'component'],
];

function checkFileSize() {
  if (isTest) return;
  const lines = raw.split('\n').length;
  for (const [re, limit, kind] of BUDGETS) {
    if (re.test(path) && lines > limit) {
      block(
        `BLOK (A19 — dosya bütçesi): ${lines} satır, ${kind} için üst sınır ${limit}.\n` +
          'Şimdi böl. "Sonra bölerim" yoktur — 1700 satırlık god component tam olarak böyle oluşur.\n' +
          'Öneri: alt bileşen çıkar, saf mantığı domain/ altına al, sorguyu ayrı api dosyasına taşı.',
      );
    }
  }
}

// ---------------------------------------------------------------- A20
function checkLayers() {
  if (!isTs || isTest) return;

  if (/\/src\/pages\//.test(path)) {
    if (/from\s+['"](@\/lib\/supabase|@supabase\/[^'"]+)['"]/.test(code)) {
      block(
        'BLOK (A20): Sayfalar Supabase\'e dokunamaz.\n' +
          'Veri erişimi yalnız `features/<ad>/api` içinde; sayfa o hook\'u çağırır.',
      );
    }
    if (/from\s+['"]@tanstack\/react-query['"]/.test(code)) {
      block(
        'BLOK (A20): Sayfalarda doğrudan useQuery/useMutation yok.\n' +
          'İlgili feature\'ın api hook\'unu çağır.',
      );
    }
  }

  if (/\/src\/features\/[^/]+\/domain\//.test(path)) {
    const bad = /from\s+['"](react|react-dom|@tanstack\/[^'"]+|@supabase\/[^'"]+|@\/lib\/supabase)['"]/.exec(
      code,
    );
    if (bad) {
      block(
        `BLOK (A20): domain/ saf mantıktır — \`${bad[1]}\` import edemez.\n` +
          'Saf fonksiyon yaz, testini yanına koy (%90 kapsam eşiği domain\'e uygulanır).',
      );
    }
  }

  if (/\/src\/components\/ui\//.test(path)) {
    if (/from\s+['"](@\/features\/[^'"]+|@\/lib\/supabase|@supabase\/[^'"]+|@tanstack\/[^'"]+)['"]/.test(code)) {
      block(
        'BLOK (A20): components/ui presentational katmandır — veri çekmez, feature import etmez.',
      );
    }
  }

  if (/\/src\/lib\//.test(path)) {
    if (/from\s+['"]@\/(features|pages)\/[^'"]+['"]/.test(code)) {
      block('BLOK (A20): lib/ alt katmandır; feature veya sayfa import edemez.');
    }
  }

  // Feature iç dosyasına çapraz import
  const own = /\/src\/features\/([^/]+)\//.exec(path);
  const cross = /from\s+['"]@\/features\/([^/'"]+)\/(api|domain|components)\/[^'"]+['"]/.exec(code);
  if (cross && cross[1] !== own?.[1]) {
    block(
      `BLOK (A20): \`${cross[1]}\` feature'ının iç dosyası doğrudan import edilemez.\n` +
        `\`@/features/${cross[1]}\` public yüzeyini (index.ts) kullan.`,
    );
  }
}

// ---------------------------------------------------------------- A17 / kural 19
function checkQueryShape() {
  if (!isTs || isTest) return;

  if (/\.select\(\s*['"`]\s*\*\s*['"`]/.test(code)) {
    block(
      'BLOK (kilitli kural 19 / A17): `select(\'*\')` yasak.\n' +
        'Kolonları açıkça yaz — hem ölçek (gereksiz veri) hem fiyat izolasyonu (A4) için.\n' +
        'Kolon listelerini feature\'ın `api/columns.ts` dosyasında topla.',
    );
  }
  if (/\.range\(\s*\d/.test(code) || /\boffset\s*[:=]\s*\d/.test(code)) {
    block(
      'BLOK (kilitli kural 19 / A17): OFFSET tabanlı sayfalama yasak.\n' +
        'Keyset kullan: `.lt(\'created_at\', cursor).order(\'created_at\', {ascending:false}).limit(PAGE_SIZE)`.\n' +
        '50.000 perakendeci ölçeğinde OFFSET her sayfada baştan tarar.',
    );
  }
}

checkSingleConstants();
checkAppIsRouterOnly();
checkNoPasswordStorage();
checkMigrationStandards();
checkPriceLeak();
checkBridgeResidue();
checkFileSize();
checkLayers();
checkQueryShape();

allow();
