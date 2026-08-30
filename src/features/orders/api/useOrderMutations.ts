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

export interface PlacedOrder {
  id: string;
  orderNo: string;
  /** Müşteriye gönderilen public takip bağlantısının anahtarı. */
  orderToken: string;
  createdAt: string;
}

/**
 * Sipariş verme — sipariş, kalemler, KATMAN 3 fiyatları, stok düşümü ve
 * cari borç kaydı TEK transaction'da yazılır. Yarım sipariş oluşamaz.
 *
 * RPC yalnız id döndürür; takip bağlantısı ve yazdırma formu için gereken
 * jeton/numara ardından okunur. Ayrı bir sorgu olması siparişi riske atmaz —
 * sipariş çoktan yazılmıştır, bu okuma yalnız ekranı besler.
 */
export function usePlaceOrder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: PlaceOrderInput): Promise<PlacedOrder> => {
      const { data, error } = await supabase.rpc('place_order_atomic', rpcArgs({
        p_relationship_id: input.relationshipId,
        p_items: toOrderItems(input.lines),
        p_customer: input.customer ?? {},
        p_salesperson_user_id: input.salespersonUserId,
      }));
      if (error) throw error;

      const orderId = String(data);
      const { data: row, error: readError } = await supabase
        .from('orders')
        .select('order_no, order_token, created_at')
        .eq('id', orderId)
        .single();
      if (readError) throw readError;

      return {
        id: orderId,
        orderNo: String(row.order_no),
        orderToken: String(row.order_token),
        createdAt: String(row.created_at),
      };
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

export interface ScheduleCustomerDeliveryInput {
  orderId: string;
  deliveryDate: string;
  timeSlot: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes?: string | undefined;
  items: Array<{ orderItemId?: string; name: string; quantity: number }>;
}

export function useScheduleCustomerDelivery() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: ScheduleCustomerDeliveryInput) => {
      const { data, error } = await supabase.rpc('schedule_customer_delivery', rpcArgs({
        p_order_id: input.orderId,
        p_delivery_date: input.deliveryDate,
        p_time_slot: input.timeSlot,
        p_customer_name: input.customerName,
        p_customer_phone: input.customerPhone,
        p_customer_address: input.customerAddress,
        p_notes: input.notes ?? undefined,
        p_items: input.items.map((i) => ({
          order_item_id: i.orderItemId,
          name: i.name,
          quantity: i.quantity,
        })),
      }));
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}
