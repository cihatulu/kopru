/**
 * Davet linkinin karşı tarafı — kimlik doğrulaması OLMADAN çalışır.
 *
 * Davet edilen henüz sistemde yok; oturumu yok. Bu yüzden `--no-verify-jwt`
 * ile deploy edilir ve `login` fonksiyonuyla aynı disiplini uygular: yetkiyi
 * TOKEN verir, çağıran değil. Token'ı bilmeyen hiçbir şey öğrenemez.
 *
 * İki eylem:
 *   peek   → davet ekranında "sizi X davet etti" yazabilmek için asgari bilgi
 *   accept → org + ilişki + giriş hesabı; şifreyi davet edilen kendi belirler
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { projectUrl, publishableKey, secretKey } from '../_shared/keys.ts';
import { corsHeaders, json } from '../_shared/cors.ts';
import { acceptInvitation, peekInvitation } from './handlers.ts';

const admin = createClient(
  projectUrl(),
  secretKey(),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

interface Body {
  action?: 'peek' | 'accept';
  token?: string;
  vknTc?: string;
  companyName?: string;
  password?: string;
  authorizedName?: string;
  email?: string;
  phone?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: 'BAD_REQUEST' }, 400);
  }

  const token = (body.token ?? '').trim();
  if (!token) return json({ error: 'BAD_REQUEST' }, 400);

  try {
    if (body.action === 'peek') return await peekInvitation(admin, token);
    if (body.action === 'accept') return await acceptInvitation(admin, token, body);
    return json({ error: 'BAD_REQUEST' }, 400);
  } catch (e) {
    console.error('accept-invitation failed', e);
    return json({ error: 'INTERNAL' }, 500);
  }
});
