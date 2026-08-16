import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ORG_KIND, STALE_TIME } from '@/constants';
import { useAuthSession } from '@/features/auth';

/**
 * MİSAFİR üreticinin kendi ürün yönetimi açık mı?
 *
 * Anahtar (`relationships.can_edit_catalog`) üye perakendecinin ekranındadır;
 * misafir üretici onu göremez ama sonucunu yaşar: anahtar kapalıysa Ürün
 * Yönetimi ekranı ona kapalıdır.
 *
 * Üye üretici için sorgu HİÇ çalışmaz — onun izni koşulsuzdur.
 *
 * Sunucu tarafı `manufacturer_may_manage_products()` ile aynı koşulu
 * uygular; burası yalnız menüyü ve rotayı süsler (kilitli kural 15).
 */
export function useMyProductPermission(): boolean {
  const { data: user } = useAuthSession();
  const orgId = user?.org?.id;
  const isGuestManufacturer =
    user?.org?.kind === ORG_KIND.manufacturer && user.org.isSubscriber === false;

  const { data } = useQuery({
    queryKey: ['counterparties', 'my-product-permission', orgId],
    enabled: !!orgId && isGuestManufacturer,
    staleTime: STALE_TIME.session,
    queryFn: async (): Promise<boolean> => {
      const { data: rows, error } = await supabase
        .from('relationships')
        .select('id')
        .eq('manufacturer_org_id', orgId ?? '')
        .eq('status', 'active')
        .eq('can_edit_catalog', true)
        .limit(1);
      if (error) throw error;
      return (rows?.length ?? 0) > 0;
    },
  });

  // Üye üreticide sorgu çalışmaz; izin koşulsuz açıktır.
  if (!isGuestManufacturer) return true;
  return data ?? false;
}
