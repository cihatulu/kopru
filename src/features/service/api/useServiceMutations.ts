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
      const { error } = await supabase.rpc('advance_ssh_status', {
        p_id: id,
        p_status: status,
        p_note: note ?? null,
      });
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
      const { error } = await supabase.rpc('set_ssh_images', { p_ssh_id: id, p_paths: paths });
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
