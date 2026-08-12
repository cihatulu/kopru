import { useState } from 'react';
import { isShipmentStep, type OrderStatus } from '../domain/status';
import { useAdvanceOrderStatus, useCancelOrder, useShipOrder } from './useOrderMutations';
import type { OrderRow } from './useOrders';

interface StatusTarget {
  orderId: string;
  targetStatus: OrderStatus;
  currentStatus: OrderStatus;
}

/**
 * Sipariş durum akışının tamamı: onay penceresi, iptal, sevkiyat.
 *
 * Sayfadan ayrıldı — durum ilerletme ile iptalin aynı yerden yürümesi şart:
 * iptal kök siparişin borcunu SİLMEZ, dengeleyici alacak yazar (A8) ve bu
 * ayrım çağrı yerine dağıtılırsa kaybolur.
 */
export function useOrderStatusFlow() {
  const [target, setTarget] = useState<StatusTarget | null>(null);
  const [note, setNote] = useState('');
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);

  const advance = useAdvanceOrderStatus();
  const cancel = useCancelOrder();
  const ship = useShipOrder();

  /** Tabloda seçilen durumu uygular; sevkiyat adımıysa sevkiyat penceresini açar. */
  const initiate = (order: OrderRow | undefined, toStatus: OrderStatus) => {
    if (!order) return;
    if (toStatus !== 'cancelled' && isShipmentStep(toStatus)) {
      setShippingOrderId(order.id);
      return;
    }
    setNote('');
    setTarget({ orderId: order.id, targetStatus: toStatus, currentStatus: order.status });
  };

  const confirm = () => {
    if (!target) return;
    const { orderId, targetStatus } = target;
    const reason = note.trim() || undefined;
    const done = { onSuccess: () => setTarget(null) };

    if (targetStatus === 'cancelled') {
      cancel.mutate({ orderId, reason }, done);
      return;
    }
    advance.mutate({ orderId, status: targetStatus, note: reason }, done);
  };

  const shipOrder = (
    items: { orderItemId: string; quantity: number }[] | null,
    note_?: string,
  ) => {
    if (!shippingOrderId) return;
    ship.mutate(
      { orderId: shippingOrderId, items, note: note_ },
      { onSuccess: () => setShippingOrderId(null) },
    );
  };

  return {
    target,
    note,
    setNote,
    shippingOrderId,
    setShippingOrderId,
    initiate,
    confirm,
    close: () => setTarget(null),
    pending: advance.isPending || cancel.isPending,
    ship,
    shipOrder,
  };
}
