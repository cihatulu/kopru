import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { SshStatus } from './shared';

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['service'] });
    void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
  };
}

export function useCreateSsh() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: {
      relationshipId: string;
      title: string;
      description?: string;
      customerName?: string;
      customerPhone?: string;
    }) => {
      const { error } = await supabase.rpc('create_ssh_request', {
        p_relationship_id: input.relationshipId,
        p_title: input.title,
        p_description: input.description ?? null,
        p_order_id: null,
        p_product_id: null,
        p_customer: { name: input.customerName ?? '', phone: input.customerPhone ?? '' },
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useAdvanceSsh() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SshStatus }) => {
      const { error } = await supabase.rpc('advance_ssh_status', { p_id: id, p_status: status });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useCreateReturn() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: {
      orderId: string;
      items: { orderItemId: string; quantity: number }[];
      reason?: string;
    }) => {
      const { error } = await supabase.rpc('create_return_request', {
        p_order_id: input.orderId,
        p_items: input.items.map((i) => ({ order_item_id: i.orderItemId, quantity: i.quantity })),
        p_reason: input.reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/**
 * İade kararı. Onay, mevcut borç kaydını DEĞİŞTİRMEZ; dengeleyici bir credit
 * ekler (A8). Tutar sunucuda siparişten hesaplanır, istemci belirleyemez.
 */
export function useDecideReturn() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, approve, note }: { id: string; approve: boolean; note?: string }) => {
      const { error } = await supabase.rpc('confirm_return_atomic', {
        p_return_id: id,
        p_approve: approve,
        p_note: note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
