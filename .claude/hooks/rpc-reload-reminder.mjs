// PostToolUse (Write|Edit) — migration'da RPC değişikliği görülürse disiplin hatırlatması.
// BLOK etmez (exit 0); stderr'e uyarı yazar (kilitli kural 6).
import { readInput, allow, norm } from './_util.mjs';

const input = await readInput();
const path = norm(input?.tool_input?.file_path);
const content = input?.tool_input?.content ?? input?.tool_input?.new_string ?? '';

if (
  /\/supabase\/migrations\/.*\.sql$/.test(path) &&
  /create\s+(or\s+replace\s+)?function/i.test(content)
) {
  const hasDrop = /drop\s+function/i.test(content);
  const hasNotify = /notify\s+pgrst/i.test(content);
  if (!hasDrop || !hasNotify) {
    process.stderr.write(
      'HATIRLATMA (kilitli kural 6 — RPC tekilliği): Bu migration bir fonksiyon tanımlıyor.\n' +
        (!hasDrop
          ? '  - İmza değiştiyse önce `DROP FUNCTION name(arg_types);` ile eski imzayı kaldır (409 ambiguous önlenir).\n'
          : '') +
        (!hasNotify ? "  - Sonunda `NOTIFY pgrst, 'reload schema';` ekle.\n" : '') +
        '  - Her RPC tek imzalı; overload bırakma.\n',
    );
  }
}

allow();
