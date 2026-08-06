// Stop — tur biterken kalite kapısı hatırlatması. BLOK etmez.
// "Araç yoksa sessiz geç": package.json yoksa hiçbir şey yapmaz.
import { readInput, allow } from './_util.mjs';
import { existsSync, readFileSync } from 'node:fs';

const input = await readInput();
const cwd = input?.cwd || process.cwd();

const pkgPath = `${cwd}/package.json`;
if (!existsSync(pkgPath)) allow();

let scripts = {};
try {
  scripts = JSON.parse(readFileSync(pkgPath, 'utf8')).scripts || {};
} catch {
  allow();
}

const have = [];
if (scripts.lint) have.push('npm run lint');
if (scripts.test) have.push('npm test');

if (have.length) {
  process.stderr.write(
    `Kalite kapısı: değişiklik yaptıysan çalıştır → ${have.join(' && ')}\n` +
      'RLS veya fiyat kolonuna dokunulduysa ayrıca: /verify-rls ve /verify-price-isolation\n',
  );
}

allow();
