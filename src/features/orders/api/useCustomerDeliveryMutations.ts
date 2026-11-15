import { useMutation } from '@tanstack/react-query';
import { rpcArgs } from '@/lib/rpc';
import { supabase } from '@/lib/supabase';
import { useInvalidate } from './useInvalidateOrders';

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

      if (error) {
        console.error('schedule_customer_delivery error:', error);
        throw error;
      }
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useCancelCustomerDelivery() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: { deliveryId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('cancel_customer_delivery', rpcArgs({
        p_delivery_id: input.deliveryId,
        p_reason: input.reason ?? undefined,
      }));

      if (error) {
        console.error('cancel_customer_delivery error:', error);
        throw error;
      }
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateCustomerDelivery() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: {
      deliveryId: string;
      deliveryDate: string;
      timeSlot: string;
      notes?: string | undefined;
    }) => {
      const { data, error } = await supabase.rpc('update_customer_delivery', rpcArgs({
        p_delivery_id: input.deliveryId,
        p_delivery_date: input.deliveryDate,
        p_time_slot: input.timeSlot,
        p_notes: input.notes ?? undefined,
      }));

      if (error) {
        console.error('update_customer_delivery error:', error);
        throw error;
      }
      return data;
    },
    onSuccess: invalidate,
  });
}
