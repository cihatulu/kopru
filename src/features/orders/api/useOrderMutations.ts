import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rpcArgs } from '@/lib/rpc';
import { supabase } from '@/lib/supabase';
import { toOrderItems, type CartLine } from '../domain/cart';
import type { OrderStatus } from '../domain/status';

export interface PlaceOrderInput {
  relationshipId: string;
  lines: CartLine[];
  /** Satışı yapan personel — raporlarda personel kırılımı için ZORUNLU. */
  salespersonUserId: string;
  // Tüm alanlar `| undefined`: form boş bıraktığında undefined gelir
  // (exactOptionalPropertyTypes açıkken "yok" ile "undefined" ayrı tiplerdir).
  customer?: {
    name?: string | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    province?: string | undefined;
    district?: string | undefined;
    address?: string | undefined;
    note?: string | undefined;
  };
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
    void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    void queryClient.invalidateQueries({ queryKey: ['catalog'] });
  };
}

/**
 * Sipariş verme — sipariş, kalemler, KATMAN 3 fiyatları, stok düşümü ve
 * cari borç kaydı TEK transaction'da yazılır. Yarım sipariş oluşamaz.
 */
export function usePlaceOrder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: PlaceOrderInput): Promise<string> => {
      const { data, error } = await supabase.rpc('place_order_atomic', rpcArgs({
        p_relationship_id: input.relationshipId,
        p_items: toOrderItems(input.lines),
        p_customer: input.customer ?? {},
        p_salesperson_user_id: input.salespersonUserId,
      }));
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useAdvanceOrderStatus() {
  const invalidate = useInvalidate();
  return useMutation({
    // `| undefined`: boş not alanı undefined olarak gelir; rpcArgs eler.
    mutationFn: async ({
      orderId,
      status,
      note,
    }: {
      orderId: string;
      status: OrderStatus;
      note?: string | undefined;
    }) => {
      const { error } = await supabase.rpc('advance_order_status', rpcArgs({
        p_order_id: orderId,
        p_status: status,
        p_note: note ?? undefined,
      }));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/**
 * Sevkiyat. `items` null ise tamamı sevk edilir; aksi halde çocuk sipariş oluşur.
 * CARİ DEFTERE DOKUNULMAZ — borç sipariş anında yazıldı, toplam sabit kalır.
 */
export function useShipOrder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      orderId,
      items,
      note,
    }: {
      orderId: string;
      items: { orderItemId: string; quantity: number }[] | null;
      note?: string | undefined;
    }) => {
      const { error } = await supabase.rpc('ship_order_atomic', rpcArgs({
        p_order_id: orderId,
        p_items: items
          ? items.map((i) => ({ order_item_id: i.orderItemId, quantity: i.quantity }))
          : null,
        p_note: note || undefined,
      }));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useCancelOrder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string | undefined }) => {
      // İptal, ilk debit kaydını DEĞİŞTİRMEZ; dengeleyici credit ekler (A8).
      const { error } = await supabase.rpc('cancel_order_atomic', rpcArgs({
        p_order_id: orderId,
        p_reason: reason ?? undefined,
      }));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
