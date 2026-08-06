// PreToolUse (Bash) — kilitli kural 1 (elle SQL yasak) + Git kuralları + yıkıcı komutlar.
import { readInput, block, allow } from './_util.mjs';

const input = await readInput();
const cmd = (input?.tool_input?.command || '').trim();
if (!cmd) allow();

const lc = cmd.toLowerCase();

// İzin verilen Supabase akış komutları — SQL yasağına takılmaz.
//
// `db push` bilinçli olarak İZİNLİDİR: yalnızca `supabase/migrations/` altındaki
// dosyaları uygular, yani kilitli kural 1'e aykırı değil — tam tersine onu uygular.
// (İlk sürümde yanlışlıkla bloklanıyordu; Docker olmayan ortamda uzak projeye
// migration uygulamanın tek yolu bu olduğu için kural düzeltildi.)
const allowedSupabase = [
  /supabase\s+migration\s+new/,
  /supabase\s+migration\s+up/,
  /supabase\s+migration\s+list/,
  /supabase\s+db\s+push/,
  /supabase\s+db\s+reset/,
  /supabase\s+db\s+diff/,
  /supabase\s+db\s+lint/,
  /supabase\s+gen\s+types/,
  /supabase\s+functions\s+deploy/,
  /supabase\s+(start|stop|status|link|login|projects)/,
];
const isAllowedSupabase = allowedSupabase.some((r) => r.test(lc));

// --- Kilitli kural 1: elle SQL yasak ---
if (!isAllowedSupabase) {
  if (/\bpsql\b/.test(lc)) {
    block(
      'BLOK (kilitli kural 1): `psql` ile elle SQL çalıştırılamaz.\n' +
        'Şema değişikliği yalnız migration ile: `supabase migration new <ad>` → dosyayı doldur → `supabase db reset`.',
    );
  }
  if (/(^|[\s;|&])(create|alter|drop)\s+(table|policy|function|view|type|index)/i.test(cmd)) {
    block(
      'BLOK (kilitli kural 1): Kabuktan doğrudan DDL çalıştırılamaz.\n' +
        'Bu ifadeyi `supabase/migrations/` altında bir migration dosyasına yaz.',
    );
  }
}

// --- Git kuralları ---
if (/git\s+push/.test(lc)) {
  block(
    'BLOK (Git kuralı): `git push` yalnızca kullanıcı açıkça "push et" dediğinde çalıştırılır.\n' +
      '"Commit et" yalnız `git add` + `git commit` demektir.',
  );
}
if (/git\s+(commit|rebase|merge)[^\n]*--no-verify/.test(lc)) {
  block('BLOK: Hook atlatma (--no-verify) yasak. Hata varsa kök sebebi düzelt.');
}

// --- Yıkıcı komutlar ---
if (/rm\s+-rf?\s+[\/~]|rm\s+-rf?\s+\*|:\(\)\{/.test(lc)) {
  block('BLOK: Yıkıcı silme komutu. Silinecek yolu daralt ve önce içeriğini doğrula.');
}
if (/git\s+reset\s+--hard|git\s+clean\s+-[a-z]*f/.test(lc)) {
  block(
    'BLOK: Bu komut commit edilmemiş çalışmayı geri döndürülemez şekilde siler.\n' +
      'Gerçekten gerekiyorsa kullanıcıdan açık onay al.',
  );
}

// --- Sır sızıntısı ---
if (/(sbp_[a-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|eyJ[A-Za-z0-9_-]{30,}\.)/.test(cmd)) {
  block(
    'BLOK: Komut satırında canlı bir sır (Supabase/GitHub token veya JWT) görünüyor.\n' +
      'Sırlar `.env.local` içinde tutulur ve `${VAR}` ile okunur; komuta veya dosyaya yazılmaz.',
  );
}

allow();
