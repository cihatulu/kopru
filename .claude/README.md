# .claude/ — Harness kurulumu (KÖPRÜ)

Bu klasör, `CLAUDE.md`'deki kilitli kuralları **otomatik zorlayan** yapılandırmayı içerir.
Kurallar yorumla değil, makineyle korunur — furniture-platform'daki 1700 satırlık
`App.tsx` tam olarak "kural yazıldı ama denetlenmedi" yüzünden oluştu.

## İlk kurulum

1. **Sırları PROJEYE bağla, makineye değil.** `.claude/settings.local.json` (git-ignored)
   içindeki `env` bloğunu doldur:

   ```json
   {
     "env": {
       "SUPABASE_PROJECT_REF": "jlcbvvvcojilizdlycgw",
       "SUPABASE_ACCESS_TOKEN": "sbp_...",
       "GITHUB_TOKEN": "ghp_..."
     }
   }
   ```

   Değişiklik Claude Code yeniden başlatıldığında etkin olur.

2. **Frontend değerleri:** `.env.example` → `.env.local` kopyala; yalnız
   `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` (public değerler).

3. **MCP'leri doğrula:** `/mcp` → `supabase` (read-only), `playwright`, `context7`,
   `chrome-devtools`, `github`. `.mcp.json` sır içermez, yalnız `${VAR}` okur.

4. **Node gerekli:** Hook'lar `.mjs` (Node) scriptleridir.

### Makine geneli ortam değişkeni KULLANMA

`SUPABASE_ACCESS_TOKEN` veya `GITHUB_TOKEN` Windows kullanıcı/sistem ortam
değişkenlerinde tutulursa:

- **Her projeye sızar.** Beş projeniz varsa beşi de aynı token'ı görür.
- **Her CLI girişini ezer.** `supabase login` / `gh auth login` yapsanız bile
  ortam değişkeni öncelikli olduğu için araçlar eski kimliği kullanır — ve hata
  mesajı bunu söylemez, sadece `Unauthorized` der.
- **Eski hesapların token'ları yıllarca dolaşır.** Bu depo kurulurken tam olarak
  bu yaşandı: eski bir projeden kalan token yeni hesabın girişini eziyordu.

Doğru yer proje başına `.claude/settings.local.json`'dır. Yeni bir proje açarken
oraya o projenin kendi token'ını yaz; projeler birbirini kirletmez.

## İçerik

| Yol | Ne |
|---|---|
| `../.mcp.json` | 5 MCP sunucusu — sır içermez, env interpolation |
| `settings.json` | Hook kayıtları |
| `hooks/*.mjs` | Kilitli kuralları zorlayan guard'lar |
| `skills/*/SKILL.md` | `/new-migration`, `/new-rpc`, `/new-edge-function`, `/new-feature`, `/gen-types`, `/verify-rls`, `/verify-price-isolation`, `/port-from-legacy` |
| `agents/*.md` | `rls-auditor`, `schema-reviewer`, `legacy-scout` — hepsi read-only |
| `ERROR_PROTOCOLS.md` | Sık hatalar + kesin çözüm. Şüphede önce buraya bak. |

## Hook'lar

`guard-write.mjs` **11 kuralı tek process'te** denetler (her kural ayrı dosya olsaydı
her yazımda 6 Node process açılırdı):

| Kontrol | Bloklar |
|---|---|
| kural 11 | ikinci constants dosyası |
| kural 10 | `App.tsx`'e iş mantığı |
| kural 2/3 | `password_hash`, istemciden auth yazma |
| kural 4 | migration'da düz `auth.uid()`, `security_invoker` eksik, `search_path` eksik, RLS'siz tablo |
| kural 5 / A4 | `products.cost_price`, `order_items.retail_unit_price`, spread ile snapshot |
| köprü | `bridge_*`, `is_shadow`, `pairing_code`, `outbound_secret` |
| A19 | dosya bütçesi (page 150 / api 150 / domain 200 / component 200) |
| A20 | katman ihlalleri ve çapraz feature import'u |
| A17 | `select('*')`, `OFFSET`/`.range()` |

Diğerleri: `guard-bash` (elle SQL, izinsiz `git push`, yıkıcı komut, sır sızıntısı) ·
`lint-changed` (PostToolUse ESLint) · `rpc-reload-reminder` (DROP→CREATE→NOTIFY) ·
`inject-plan-reminder` (UserPromptSubmit bağlam) · `final-gate` (tur sonu lint/test).

**Hook bir yazımı bloklarsa hook'u devre dışı bırakma — kuralı uygula.**
Kural gerçekten yanlışsa önce `PLAN.md` §12'deki ADR'yi tartış, sonra ikisini birlikte güncelle.
Geçici devre dışı bırakma gerekiyorsa `settings.local.json` (git-ignored) kullan.
