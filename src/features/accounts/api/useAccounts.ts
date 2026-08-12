import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PAGE_SIZE, STALE_TIME } from '@/constants';


// Açık kolon listesi (kilitli kural 19). Cari YALNIZ KATMAN 2 tutarlarından oluşur (A5).
// Dışa aktarım da aynı kolonları çeker; iki liste ayrışırsa dosya ekrandan
// farklı veri gösterirdi.
export const TX_COLUMNS =
  'id, type, amount, balance_after, description, created_at, order_id, relationship_id, items_snapshot, order:order_id(order_no)';

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number => Number(v ?? 0);
const obj = (v: unknown): Row => (typeof v === 'object' && v !== null ? (v as Row) : {});

export interface LedgerItemSnapshot {
  name: string;
  code?: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
}

export interface LedgerEntry {
  id: string;
  type: 'debit' | 'credit';
  amount: number;
  /** Bu satırdan sonraki bakiye. Bakiye SUM ile değil bundan okunur (A18). */
  balanceAfter: number;
  description: string;
  createdAt: string;
  orderId: string | null;
  orderNo?: string | null;
  itemsSnapshot?: LedgerItemSnapshot[];
}

export function toEntry(raw: unknown): LedgerEntry {
  const r = raw as Row;
  const orderData = obj(r.order);
  const orderNo = typeof orderData.order_no === 'string' ? orderData.order_no : null;
  let description = str(r.description);

  if (orderNo && !description.includes(orderNo)) {
    if (description === 'Sipariş' || description === 'Sipari') {
      description = `Sipariş #${orderNo}`;
    } else if (description.startsWith('Sipariş iptali') && !description.includes(orderNo)) {
      const rest = description.replace(/^Sipariş iptali:?\s*/i, '');
      description = rest ? `Sipariş iptali: #${orderNo} (${rest})` : `Sipariş iptali: #${orderNo}`;
    } else if (description.startsWith('İade') && !description.includes(orderNo)) {
      const rest = description.replace(/^İade:?\s*/i, '');
      description = rest ? `Sipariş iadesi: #${orderNo} (${rest})` : `Sipariş iadesi: #${orderNo}`;
    } else {
      description = `${description} (#${orderNo})`;
    }
  }

  const rawItems = Array.isArray(r.items_snapshot) ? r.items_snapshot : [];
  const itemsSnapshot: LedgerItemSnapshot[] = rawItems.map((itemRaw) => {
    const item = obj(itemRaw);
    return {
      name: str(item.name) || 'Ürün',
      code: str(item.code),
      quantity: num(item.quantity || 1),
      unitPrice: item.unit_price !== undefined ? num(item.unit_price) : undefined,
      total: item.total !== undefined ? num(item.total) : undefined,
    };
  });

  return {
    id: str(r.id),
    type: r.type as 'debit' | 'credit',
    amount: num(r.amount),
    balanceAfter: num(r.balance_after),
    description,
    createdAt: str(r.created_at),
    orderId: typeof r.order_id === 'string' ? r.order_id : null,
    orderNo,
    itemsSnapshot: itemsSnapshot.length > 0 ? itemsSnapshot : undefined,
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

/** İstek modu: misafir karşı taraf → direct, abone karşı taraf → pending. */
export type RequestMode = 'direct' | 'pending';

/**
 * Elle cari hareketi iste — KİLİTLİ KURAL 8 (son hali).
 *
 * Karşı taraf misafirse doğrudan transactions'a yazar; aboneyse
 * manual_transaction_requests'e düşer. Hangi modda işlendiği `mode` ile döner.
 */
export function useRequestManualTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      relationshipId: string;
      type: 'debit' | 'credit';
      amount: number;
      description: string;
    }): Promise<{ mode: RequestMode; id: string }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('request_manual_transaction', {
        p_relationship_id: input.relationshipId,
        p_type: input.type,
        p_amount: input.amount,
        p_description: input.description,
      });
      if (error) throw error;
      const d = data as { mode: RequestMode; id: string };
      return d;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

// ── Bekleyen istekler ─────────────────────────────────────────────────────────

export interface PendingRequest {
  id: string;
  relationshipId: string;
  requestingOrgId: string;
  companyName: string;
  type: 'debit' | 'credit';
  amount: number;
  description: string;
  createdAt: string;
}

/**
 * Bir ilişkiye ait bekleyen onay istekleri.
 *
 * Her iki tarafın istekleri döner: kendi açtığım (kapatamam) ve karşı tarafın
 * açtığı (onaylayabilirim/reddedebilirim). `requestingOrgId` karşılaştırmasıyla
 * UI kimin istediğini ayırt eder.
 */
export function usePendingRequests(relationshipId: string | null) {
  return useQuery({
    queryKey: ['accounts', 'pending', relationshipId],
    enabled: !!relationshipId,
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<PendingRequest[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('manual_transaction_requests')
        .select('id, relationship_id, requesting_org_id, requesting_user_id, type, amount, description, created_at')
        .eq('relationship_id', relationshipId ?? '')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data ?? []) as any[]).map((r) => ({
        id: String(r.id),
        relationshipId: String(r.relationship_id),
        requestingOrgId: String(r.requesting_org_id),
        companyName: '',   // AccountDetailDialog üst bileşeninden geçer
        type: r.type as 'debit' | 'credit',
        amount: Number(r.amount),
        description: String(r.description),
        createdAt: String(r.created_at),
      }));
    },
  });
}

/** Bekleyen isteği onayla veya reddet. */
export function useDecideRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string; approve: boolean }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('decide_manual_transaction', {
        p_request_id: input.requestId,
        p_approve: input.approve,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

/** Manuel cari kaydı güncelle. */
export function useUpdateManualTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      transactionId: string;
      type: 'debit' | 'credit';
      amount: number;
      description: string;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('update_manual_transaction', {
        p_transaction_id: input.transactionId,
        p_type: input.type,
        p_amount: input.amount,
        p_description: input.description,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

/** Manuel cari kaydı sil. */
export function useDeleteManualTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transactionId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('delete_manual_transaction', {
        p_transaction_id: transactionId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}
