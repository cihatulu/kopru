import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';
import { toBounds, type LedgerSummary, type Period } from '../domain/period';

/**
 * Dönem özeti — devir, toplam borç/alacak, kapanış.
 *
 * Toplamlar SUNUCUDA hesaplanır. İstemcide hesaplasaydık yalnız YÜKLENMİŞ
 * sayfaların toplamını gösterirdik: kullanıcı "daha fazla yükle"ye bastıkça
 * "toplam borç" büyürdü. Mutabakat sayısı böyle davranamaz.
 */
export function useLedgerSummary(relationshipId: string | null, period: Period) {
  return useQuery({
    queryKey: ['accounts', 'summary', relationshipId, period],
    enabled: !!relationshipId,
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<LedgerSummary> => {
      const bounds = toBounds(period);
      const { data, error } = await supabase.rpc('ledger_period_summary', {
        p_relationship_id: relationshipId!,
        p_from: bounds.from,
        p_to: bounds.to,
      });
      if (error) throw error;

      const r = (data ?? {}) as Record<string, unknown>;
      return {
        openingBalance: Number(r.opening_balance ?? 0),
        totalDebit: Number(r.total_debit ?? 0),
        totalCredit: Number(r.total_credit ?? 0),
        closingBalance: Number(r.closing_balance ?? 0),
        entryCount: Number(r.entry_count ?? 0),
      };
    },
  });
}
