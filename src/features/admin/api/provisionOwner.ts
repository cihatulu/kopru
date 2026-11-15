import { supabase } from '@/lib/supabase';

export interface ProvisionResult {
  /** false → owner zaten vardı; geçici şifre dönmez. */
  created: boolean;
  userCode: string;
  tempPassword?: string;
}

// supabase-js `error` alanını `any` olarak tipler; sonucu açıkça daraltıyoruz.
interface ProvisionInvokeResult {
  data: ProvisionResult | null;
  error: unknown;
}

/**
 * Üye organizasyonun giriş yapabilmesi için owner hesabını açar.
 *
 * Hesap `admin-provision-owner` Edge Function'ında açılır (kilitli kural 2);
 * owner zaten varsa ikinci hesap açılmaz. Başarısızlıkta `null` döner —
 * çağıran taraf org kaydını geri almaz, "Şifre yenile" ile tekrar denenebilir.
 */
export async function provisionOwner(orgId: string): Promise<ProvisionResult | null> {
  const { data, error } = (await supabase.functions.invoke<ProvisionResult>(
    'admin-provision-owner',
    { body: { orgId } },
  )) as ProvisionInvokeResult;
  if (error || !data) return null;
  return data;
}
