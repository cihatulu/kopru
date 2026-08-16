import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';

/**
 * Bana gelen, henüz yanıtlamadığım bağlantı isteklerinin SAYISI.
 *
 * Neden ayrı ve sayı-yalnız bir sorgu: rozet her sayfada çizilir, oysa
 * `useCounterparties` sayfalanmış tam listeyi çeker. Rozet için tüm
 * kenarları indirmek, menüyü açmak uğruna yüzlerce satır taşımak olurdu.
 * `head: true` ile gövde hiç gelmez, yalnız sayaç döner.
 *
 * RLS zaten yalnız benim taraf olduğum kenarları görünür kılar (A16);
 * burada ayrıca org süzgeci yazmaya gerek yok. Tek koşul isteği BAŞKASININ
 * başlatmış olmasıdır — kendi gönderdiğim istek bana bildirim değildir.
 */
export function usePendingConnectionCount(myOrgId: string | undefined) {
  return useQuery({
    queryKey: ['counterparties', 'pending-count', myOrgId],
    enabled: !!myOrgId,
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<number> => {
      if (!myOrgId) return 0;
      const { count, error } = await supabase
        .from('relationships')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .neq('initiated_by_org_id', myOrgId);
      if (error) throw error;
      return count ?? 0;
    },
  });
}
