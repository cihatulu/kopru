import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME } from '@/constants';
import type { FinanceKind, PaymentMethod } from '../domain/finance';

const COLUMNS =
  'id, kind, amount, method, category, description, occurred_on, created_at';

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export interface FinanceEntry {
  id: string;
  kind: FinanceKind;
  amount: number;
  method: PaymentMethod;
  category: string | null;
  description: string;
  occurredOn: string;
  createdAt: string;
}

function toEntry(raw: unknown): FinanceEntry {
  const r = raw as Row;
  return {
    id: str(r.id),
    kind: r.kind as FinanceKind,
    amount: Number(r.amount ?? 0),
    method: r.method as PaymentMethod,
    category: typeof r.category === 'string' ? r.category : null,
    description: str(r.description),
    occurredOn: str(r.occurred_on),
    createdAt: str(r.created_at),
  };
}

/**
 * Perakendecinin kendi gelir/gider defteri — tedarikçi carisinden AYRIDIR.
 * Biri borç ilişkisi, diğeri işletme nakit akışı. Üreticinin erişimi yoktur.
 */
export function useFinanceEntries() {
  return useInfiniteQuery({
    queryKey: ['finance'],
    staleTime: STALE_TIME.transactional,
    initialPageParam: undefined as { createdAt: string; id: string } | undefined,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from('finance_entries')
        .select(COLUMNS)
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

export function useAddFinanceEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      retailerOrgId: string;
      kind: FinanceKind;
      amount: number;
      method: PaymentMethod;
      description: string;
      category?: string;
    }) => {
      const { error } = await supabase.from('finance_entries').insert({
        retailer_org_id: input.retailerOrgId,
        kind: input.kind,
        amount: input.amount,
        method: input.method,
        description: input.description,
        category: input.category ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance'] }),
  });
}
