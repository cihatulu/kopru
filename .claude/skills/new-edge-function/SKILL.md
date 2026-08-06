---
name: new-edge-function
description: Yeni Supabase Edge Function (Deno) iskeleti oluştur — _shared/cors.ts + _shared/auth.ts, CORS + OPTIONS handler. Edge Function eklerken kullan. Giriş yalnız login, şifre yalnız update-user-password.
---

# new-edge-function

Mevcut yetkili fonksiyonlar:

| Fonksiyon | Tekel |
|---|---|
| `login` | **Tek giriş yolu** (kural 3). Kullanıcı arama, sponsor VKN doğrulama, kilit sayacı burada. |
| `update-user-password` | **Tek şifre yolu** (kural 2). `auth.admin.*`. |
| `update-stock` | **Tek stok yazma yolu** (kural 14). Service role. |

## Yapı

```
supabase/functions/
  _shared/cors.ts
  _shared/auth.ts
  <function-name>/index.ts
```

## `_shared/cors.ts`

```ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
```

## `index.ts` iskeleti

```ts
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Preflight ZORUNLU
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // yetki kontrolü (_shared/auth.ts) + iş mantığı
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    // Hata mesajı istemciye sızdırılmaz; kod döner, detay loglanır.
    console.error(e);
    return new Response(JSON.stringify({ error: 'INTERNAL' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

## Güvenlik kuralları

- Service role anahtarı yalnız `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`; frontend'e **girmez**.
- `login` gibi kimlik fonksiyonlarında tüm başarısız yollar **tek tip mesaj** döner —
  hangi adımda düştüğü sızdırılmaz (kullanıcı numaralandırma).
- Service role ile yazarken RLS bypass edilir; org kapsamını **elle** doğrula.

## Deploy

```bash
npx supabase functions deploy <function-name>
```
`login` gibi anonim çağrılan fonksiyonlar `--no-verify-jwt` ile deploy edilir.
