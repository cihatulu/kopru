// PostToolUse (Write|Edit) — değişen .ts/.tsx için ESLint (kilitli kural 13).
// "Araç yoksa sessiz geç": erken fazda node_modules/eslint yoksa hata vermez.
import { readInput, block, allow, norm } from './_util.mjs';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const input = await readInput();
const path = norm(input?.tool_input?.file_path);
if (!path || !/\.(ts|tsx)$/.test(path)) allow();
// supabase/functions = Deno (ayrı toolchain); proje ESLint'i kapsamaz.
if (/\/supabase\/functions\//.test(path)) allow();

const cwd = input?.cwd || process.cwd();
const eslintJs = `${cwd}/node_modules/eslint/bin/eslint.js`;
if (!existsSync(eslintJs)) allow();

// node + eslint.js — Windows/Unix ortak, shell gerektirmez.
const res = spawnSync(process.execPath, [eslintJs, path, '--max-warnings=0'], {
  cwd,
  encoding: 'utf8',
});

if (res.status && res.status !== 0) {
  block(
    'ESLint hatası (kilitli kural 13 — lint zorunlu):\n' +
      (res.stdout || res.stderr || '').trim() +
      '\n\nKatman kuralı ihlali ise (A20) dosyayı doğru katmana taşı; kuralı gevşetme.',
  );
}

allow();
