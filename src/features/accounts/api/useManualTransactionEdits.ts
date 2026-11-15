import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Deftere YAZILMIŞ manuel kaydın düzeltilmesi.
 *
 * Ledger değişmezliği (kilitli kural 7): `update_manual_transaction` mevcut
 * satıra dokunmaz; eski kaydı ters yönde bir İPTAL satırıyla geri alır ve yeni
 * değerlerle yeni satır yazar. Silme buradan YAPILMAZ — yalnız talep/onay
 * akışıyla (`useManualTransactionRequests.ts`); silme RPC'si istemciye kapalıdır.
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
