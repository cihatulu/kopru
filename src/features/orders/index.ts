// features/orders PUBLIC YÜZEYİ (A20).

export { useOrders } from './api/useOrders';
export { useOrderDetail } from './api/useOrderDetail';
export { useOrderStats } from './api/useOrderStats';
export type { OrderStats } from './api/useOrderStats';
export type { OrderRow, OrderDetail, OrderItemRow } from './domain/orderMapping';

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

export { useOrderStatusFlow } from './api/useOrderStatusFlow';

export { OrderTable } from './components/OrderTable';
export { OrderStatCards } from './components/OrderStatCards';
export type { OrderFilter } from './components/OrderStatCards';
export { StatusUpdateDialog } from './components/StatusUpdateDialog';
export { OrderStatusBadge } from './components/OrderStatusBadge';
export { CartPanel } from './components/CartPanel';
export { ShipmentDialog } from './components/ShipmentDialog';
export { OrderDetailPanel } from './components/OrderDetailPanel';
export { CartProvider, useCart } from './context/CartContext';
