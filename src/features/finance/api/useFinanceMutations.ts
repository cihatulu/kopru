import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { rpcArgs } from '@/lib/rpc';
import type { FinanceKind, PaymentMethod } from '../domain/finance';

interface AddTransactionArgs {
  type: FinanceKind;
  method: PaymentMethod;
  amount: number;
  description: string;
  order_id?: string;
  manufacturer_id?: string;
}

/**
 * Kasa/POS defterine kayıt ekler.
 *
 * Yöntem `pos_manufacturer` + tür `income` ise RPC aynı transaction içinde
 * cariye `credit` satırı da yazar (kural 7 — mevcut satırlara dokunmaz).
 */
export function useAddFinanceTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: AddTransactionArgs) => {
      const { data, error } = await supabase.rpc(
        'add_finance_transaction',
        // rpcArgs: undefined alanları eler, RPC kendi default null'ını uygular.
        rpcArgs({
          p_type: args.type,
          p_method: args.method,
          p_amount: args.amount,
          p_description: args.description,
          p_order_id: args.order_id,
          p_manufacturer_id: args.manufacturer_id,
        }),
      );
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['finance_transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
