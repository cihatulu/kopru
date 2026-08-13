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
export { useTrackOrder } from './api/useTrackOrder';
export {
  TRACK_STEPS,
  aggregate,
  isCustomerPayment,
  linesTotal,
  sourcesOf,
  stepIndexOf,
} from './domain/tracking';
export type { TrackedOrder, TrackedItem, AggregatedLine } from './domain/tracking';
export { TrackOrderView } from './components/TrackOrderView';
export { TrackSteps } from './components/TrackSteps';

export { useCheckout } from './api/useCheckout';
export type { CheckoutContext } from './api/useCheckout';
export { useCheckoutForm } from './api/useCheckoutForm';
export type { CheckoutForm, PaymentMethod } from './api/useCheckoutForm';

export type { PlacedOrder } from './api/useOrderMutations';

export {
  buildOrderReferenceCode,
  buildOrderTrackingMessage,
  trackingUrl,
  TRACK_PATH,
} from './domain/orderShare';
export { buildOrderPrintHtml, paymentMethodLabel } from './domain/printOrder';
export type { PrintableOrder, PrintableOrderItem } from './domain/printOrder';

export { manufacturersInCart, resolveCartTarget, toOrderCustomer } from './domain/checkout';
export type { CartSupplier, CartTarget, CustomerFields } from './domain/checkout';

export { OrderTable } from './components/OrderTable';
export { OrderStatCards } from './components/OrderStatCards';
export type { OrderFilter } from './components/OrderStatCards';
export { StatusUpdateDialog } from './components/StatusUpdateDialog';
export { OrderStatusBadge } from './components/OrderStatusBadge';
export { CartPanel } from './components/CartPanel';
export { CartCheckoutPanel } from './components/CartCheckoutPanel';
export { CartLinesTable } from './components/CartLinesTable';
export { CartNotice } from './components/CartNotice';
export { CartSummaryCard } from './components/CartSummaryCard';
export { CheckoutFields } from './components/CheckoutFields';
export { DownPaymentPanel } from './components/DownPaymentPanel';
export { OrderPlacedDialog } from './components/OrderPlacedDialog';
export { SalespersonSelect } from './components/SalespersonSelect';
export type { SalespersonOption } from './components/SalespersonSelect';
export { ShipmentDialog } from './components/ShipmentDialog';
export { OrderDetailPanel } from './components/OrderDetailPanel';
export { CartProvider, useCart } from './context/CartContext';
