// features/orders PUBLIC YÜZEYİ (A20).

export { useOrders, useOrderDetail, useOrderStats } from './api/useOrders';
export type { OrderRow, OrderDetail, OrderItemRow, OrderStats } from './api/useOrders';

export {
  usePlaceOrder,
  useAdvanceOrderStatus,
  useShipOrder,
  useCancelOrder,
} from './api/useOrderMutations';
export type { PlaceOrderInput } from './api/useOrderMutations';

export {
  ORDER_STATUS_META,
  nextAction,
  canCancel,
  isClosed,
  isShipmentStep,
  getAvailableTransitions,
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

export { OrderTable } from './components/OrderTable';
export { OrderStatusBadge } from './components/OrderStatusBadge';
export { CartPanel } from './components/CartPanel';
export { ShipmentDialog } from './components/ShipmentDialog';
export { OrderDetailPanel } from './components/OrderDetailPanel';
export { CartProvider, useCart } from './context/CartContext';
