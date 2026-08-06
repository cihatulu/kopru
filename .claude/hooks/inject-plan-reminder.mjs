// UserPromptSubmit — kod görevlerinde PLAN + kilitli kural bağlamını enjekte eder.
// stdout (exit 0) bağlama eklenir. Kısa/sohbet promptlarında sessiz.
import { readInput, emit, allow } from './_util.mjs';

const input = await readInput();
const prompt = (input?.prompt || '').toLowerCase();

if (prompt.length < 12) allow();

const codey =
  /(migration|rls|rpc|edge|supabase|order|sipari|cari|ledger|transaction|stok|stock|component|feature|katalog|product|ürün|test|policy|view|function|şema|schema|hook|store|zustand|react-query|fiyat|price|org|ilişki|relationship|login|giriş|abone|misafir)/i;
if (!codey.test(prompt)) allow();

emit(
  '<system-reminder>\n' +
    'Bu görevde: (1) PLAN.md ilgili bölümünü oku. (2) CLAUDE.md kilitli kurallarına uy:\n' +
    '· şema yalnız migration, elle SQL yok · şifre yalnız update-user-password, giriş yalnız login Edge Function\n' +
    "· RLS'te (select auth.uid()); view security_invoker=true; fonksiyon SET search_path=public\n" +
    '· RLS anahtarı denormalize manufacturer_org_id/retailer_org_id — relationship_id IN (SELECT ...) YASAK\n' +
    '· üç fiyat katmanı ayrı tablolarda: products.supplier_price ortak, product_costs üreticiye, retail_prices perakendeciye\n' +
    '· RPC tek imza (DROP→CREATE→NOTIFY) · ledger değişmez, bakiye balance_after ile okunur\n' +
    "· keyset pagination, OFFSET ve select('*') yasak\n" +
    '· dosya bütçesi: page 150 / api 150 / domain 200 / component 200 satır\n' +
    '· katman: supabase yalnız features/*/api · domain saf · pages yalnız kompozisyon\n' +
    '· köprü kavramı (bridge_*, is_shadow, pairing_code) bu projede YOK\n' +
    "Şüphede .claude/ERROR_PROTOCOLS.md'ye bak.\n" +
    '</system-reminder>',
);
