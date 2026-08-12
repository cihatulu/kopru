import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rpcArgs } from '@/lib/rpc';
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
      orderId?: string;
      productId?: string;
      customerName?: string;
      customerPhone?: string;
    }): Promise<string> => {
      const isUuid = (val?: string) =>
        !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

      const { data, error } = await supabase.rpc('create_ssh_request', rpcArgs({
        p_relationship_id: input.relationshipId,
        p_title: input.title,
        p_description: input.description?.trim() || undefined,
        p_order_id: isUuid(input.orderId) ? input.orderId : undefined,
        p_product_id: isUuid(input.productId) ? input.productId : undefined,
        p_customer: (input.customerName?.trim() || input.customerPhone?.trim())
          ? { name: input.customerName?.trim() || '', phone: input.customerPhone?.trim() || '' }
          : undefined,
      }));
      if (error) {
        console.error('[create_ssh_request] rpc error:', error.message, error.details, error.hint);
        throw error;
      }
      console.log('[create_ssh_request] success, new ssh id:', data);
      return String(data);
    },
    onSuccess: invalidate,
  });
}

/**
 * Durum ilerletme. Not isteğe bağlıdır ama geçmişin asıl değeri odur —
 * "neden iptal edildi" sorusunun cevabı başka hiçbir yerde durmuyor.
 */
export function useAdvanceSsh() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      note,
    }: {
      id: string;
      status: SshStatus;
      note?: string;
    }) => {
      const { error } = await supabase.rpc('advance_ssh_status', rpcArgs({
        p_id: id,
        p_status: status,
        p_note: note ?? undefined,
      }));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/**
 * Fotoğraf yollarını kayda işler.
 *
 * Yükleme Storage'a, kayıt buraya: iki adım ayrıdır çünkü dosya kaydedilmeden
 * önce de yüklenebilmeli. Sunucu tarafın ilişkiye taraf olduğunu ve talebin
 * kapanmadığını yeniden doğrular.
 */
export function useSetSshImages() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, paths }: { id: string; paths: string[] }) => {
      const { error } = await supabase.rpc('set_ssh_images', rpcArgs({ p_ssh_id: id, p_paths: paths }));
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
      const { error } = await supabase.rpc('create_return_request', rpcArgs({
        p_order_id: input.orderId,
        p_items: input.items.map((i) => ({ order_item_id: i.orderItemId, quantity: i.quantity })),
        p_reason: input.reason ?? undefined,
      }));
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
      const { error } = await supabase.rpc('confirm_return_atomic', rpcArgs({
        p_return_id: id,
        p_approve: approve,
        p_note: note ?? undefined,
      }));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
