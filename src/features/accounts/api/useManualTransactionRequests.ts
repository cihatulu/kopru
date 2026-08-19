import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIME } from '@/constants';

/**
 * Elle cari hareketi için ÖNERİ akışı: iste → beklet → karara bağla.
 *
 * Buradaki kayıtlar henüz deftere yazılmamıştır; `manual_transaction_requests`
 * tablosunda yaşarlar. Deftere yazılmış kaydın düzeltilmesi ayrı bir konudur
 * (`useManualTransactionEdits.ts` — orada ledger değişmezliği geçerlidir).
 */

/** İstek modu: misafir karşı taraf → direct, abone karşı taraf → pending. */
export type RequestMode = 'direct' | 'pending';

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
      const { data, error } = await supabase.rpc('request_manual_transaction', {
        p_relationship_id: input.relationshipId,
        p_type: input.type,
        p_amount: input.amount,
        p_description: input.description,
      });
      if (error) throw error;
      return data as unknown as { mode: RequestMode; id: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
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
      const { data, error } = await supabase
        .from('manual_transaction_requests')
        .select(
          'id, relationship_id, requesting_org_id, requesting_user_id, type, amount, description, created_at',
        )
        .eq('relationship_id', relationshipId ?? '')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;

      return (data ?? []).map((r) => ({
        id: String(r.id),
        relationshipId: String(r.relationship_id),
        requestingOrgId: String(r.requesting_org_id),
        companyName: '', // AccountDetailDialog üst bileşeninden geçer
        type: r.type,
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
      const { error } = await supabase.rpc('decide_manual_transaction', {
        p_request_id: input.requestId,
        p_approve: input.approve,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export interface PendingDeleteRequest {
  id: string;
  relationshipId: string;
  transactionId: string;
  requestingOrgId: string;
  companyName: string;
  createdAt: string;
  transactionDescription: string;
  transactionAmount: number;
  transactionType: 'debit' | 'credit';
}

export function useRequestDeleteManualTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transactionId: string): Promise<{ mode: RequestMode; id: string | null }> => {
      const { data, error } = await supabase.rpc('request_delete_manual_transaction', {
        p_transaction_id: transactionId,
      });
      if (error) throw error;
      return data as unknown as { mode: RequestMode; id: string | null };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function usePendingDeleteRequests(relationshipId: string | null) {
  return useQuery({
    queryKey: ['accounts', 'pending-deletes', relationshipId],
    enabled: !!relationshipId,
    staleTime: STALE_TIME.transactional,
    queryFn: async (): Promise<PendingDeleteRequest[]> => {
      const { data, error } = await supabase
        .from('manual_transaction_delete_requests')
        .select(`
          id,
          relationship_id,
          transaction_id,
          requesting_org_id,
          created_at,
          transaction:transaction_id(description, amount, type)
        `)
        .eq('relationship_id', relationshipId ?? '')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;

      return (data ?? []).map((r: any) => {
        const tx = r.transaction ? r.transaction : {};
        return {
          id: String(r.id),
          relationshipId: String(r.relationship_id),
          transactionId: String(r.transaction_id),
          requestingOrgId: String(r.requesting_org_id),
          companyName: '',
          createdAt: String(r.created_at),
          transactionDescription: String(tx.description || ''),
          transactionAmount: Number(tx.amount || 0),
          transactionType: tx.type || 'debit',
        };
      });
    },
  });
}

export function useDecideDeleteRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string; approve: boolean }) => {
      const { error } = await supabase.rpc('decide_delete_manual_transaction', {
        p_request_id: input.requestId,
        p_approve: input.approve,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
