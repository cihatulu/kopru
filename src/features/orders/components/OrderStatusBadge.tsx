import { ORDER_STATUS_META, type OrderStatus } from '../domain/status';

/** Sipariş durumunun renkli rozeti — tabloda, detayda ve tarihçede aynı görünür. */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_META[status];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}
