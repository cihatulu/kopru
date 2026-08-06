// features/orders PUBLIC YÜZEYİ (A20).

export { useOrders, useOrderDetail } from './api/useOrders';
export type { OrderRow, OrderDetail, OrderItemRow } from './api/useOrders';

export { usePlaceOrder, useAdvanceOrderStatus, useCancelOrder } from './api/useOrderMutations';
export type { PlaceOrderInput } from './api/useOrderMutations';

export {
  ORDER_STATUS_META,
  nextAction,
  canCancel,
  isClosed,
} from './domain/status';
export type { OrderStatus } from './domain/status';

export {
  addLine,
  setQuantity,
  setRetailPrice,
  cartTotals,
  lineTotal,
  toOrderItems,
} from './domain/cart';
export type { CartLine, CartTotals } from './domain/cart';

export { OrderTable, OrderStatusBadge } from './components/OrderTable';
export { CartPanel } from './components/CartPanel';
export { OrderDetailPanel } from './components/OrderDetailPanel';
