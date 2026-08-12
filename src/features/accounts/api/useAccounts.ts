import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME } from '@/constants';
import { toEntry } from '../domain/ledgerEntry';

/**
 * Cari ekstrenin OKUNMASI.
 *
 * Ekstreyi değiştiren uçlar ayrı dosyalarda:
 *   · `useManualTransactionRequests.ts` — öneri/onay akışı
 *   · `useManualTransactionEdits.ts`    — yazılmış kaydın düzeltilmesi
 * Satırın DB'den nesneye dönüşümü saf mantıktır: `domain/ledgerEntry.ts`.
 */

// Açık kolon listesi (kilitli kural 19). Cari YALNIZ KATMAN 2 tutarlarından oluşur (A5).
// Dışa aktarım da aynı kolonları çeker; iki liste ayrışırsa dosya ekrandan
// farklı veri gösterirdi.
export const TX_COLUMNS =
  'id, type, amount, balance_after, description, created_at, order_id, relationship_id, items_snapshot, order:order_id(order_no)';

/** Cari ekstre — keyset sayfalama (A17). */
export function useLedger(relationshipId: string | null) {
  return useInfiniteQuery({
    queryKey: ['accounts', 'ledger', relationshipId],
    enabled: !!relationshipId,
    staleTime: STALE_TIME.transactional,
    initialPageParam: undefined as { createdAt: string; id: string } | undefined,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from('transactions')
        .select(TX_COLUMNS)
        .eq('relationship_id', relationshipId ?? '')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE);

      if (pageParam) {
        q = q.or(
          `created_at.lt.${pageParam.createdAt},and(created_at.eq.${pageParam.createdAt},id.lt.${pageParam.id})`,
        );
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(toEntry);
    },
    getNextPageParam: (last) => {
      if (last.length < PAGE_SIZE) return undefined;
      const l = last[last.length - 1];
      return l ? { createdAt: l.createdAt, id: l.id } : undefined;
    },
  });
}

/**
 * Güncel bakiye — SON satırın `balance_after` değeri (A18).
 * SUM() kullanılmaz; milyonlarca satırda tam tarama demektir.
 */
export function useBalance(relationshipId: string | null) {
  return useQuery({
    queryKey: ['accounts', 'balance', relationshipId],
    enabled: !!relationshipId,
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from('transactions')
        .select('balance_after')
        .eq('relationship_id', relationshipId ?? '')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? Number(data.balance_after) : 0;
    },
  });
}
