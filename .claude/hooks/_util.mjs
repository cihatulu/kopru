// Ortak hook yardımcıları. Tüm hook'lar stdin'den JSON okur.
// Claude Code hook sözleşmesi:
//   exit 0  → izin ver
//   exit 2  → BLOK; stderr Claude'a geri beslenir
//   stdout (UserPromptSubmit, exit 0) → bağlama eklenir

export async function readInput() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** BLOK: mesajı stderr'e yaz, exit 2. */
export function block(message) {
  process.stderr.write(message + '\n');
  process.exit(2);
}

/** İZİN: sessizce çık. */
export function allow() {
  process.exit(0);
}

/** UserPromptSubmit: stdout bağlama eklenir. */
export function emit(text) {
  process.stdout.write(text + '\n');
  process.exit(0);
}

/** Yol normalize — Windows ters bölü işaretlerini düzleştirir. */
export function norm(p) {
  return (p || '').replace(/\\/g, '/');
}

/** Yorum ve string olmayan kod satırlarını kabaca ayıklar (yorumdaki örnekler bloklanmasın). */
export function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1')
    .replace(/(^|\s)--.*$/gm, '$1');
}
