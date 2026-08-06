import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME } from '@/constants';

// Açık kolon listesi (kilitli kural 19). Cari YALNIZ KATMAN 2 tutarlarından oluşur (A5).
const TX_COLUMNS =
  'id, type, amount, balance_after, description, created_at, order_id, relationship_id';

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export interface LedgerEntry {
  id: string;
  type: 'debit' | 'credit';
  amount: number;
  /** Bu satırdan sonraki bakiye. Bakiye SUM ile değil bundan okunur (A18). */
  balanceAfter: number;
  description: string;
  createdAt: string;
  orderId: string | null;
}

function toEntry(raw: unknown): LedgerEntry {
  const r = raw as Row;
  return {
    id: str(r.id),
    type: r.type as 'debit' | 'credit',
    amount: Number(r.amount ?? 0),
    balanceAfter: Number(r.balance_after ?? 0),
    description: str(r.description),
    createdAt: str(r.created_at),
    orderId: typeof r.order_id === 'string' ? r.order_id : null,
  };
}

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

/** Elle cari hareketi — KİLİTLİ KURAL 8: perakendeci/accountant yazar, üretici izler. */
export function useAddManualTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      relationshipId: string;
      type: 'debit' | 'credit';
      amount: number;
      description: string;
    }) => {
      const { error } = await supabase.rpc('add_manual_transaction', {
        p_relationship_id: input.relationshipId,
        p_type: input.type,
        p_amount: input.amount,
        p_description: input.description,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}
