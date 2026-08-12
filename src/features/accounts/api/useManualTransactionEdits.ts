import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Deftere YAZILMIŞ manuel kaydın düzeltilmesi ve silinmesi.
 *
 * Ledger değişmezliği (kilitli kural 7) burada geçerlidir: RPC'ler mevcut
 * satırı UPDATE/DELETE etmez, dengeleyici yeni satır yazar ve running
 * balance'ı yeniden kurar. İstemci yalnız RPC'yi çağırır.
 *
 * Henüz yazılmamış önerilerin akışı için `useManualTransactionRequests.ts`.
 */

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
      const { error } = await supabase.rpc('update_manual_transaction', {
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
      const { error } = await supabase.rpc('delete_manual_transaction', {
        p_transaction_id: transactionId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}
