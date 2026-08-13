/** Sipariş paylaşımı — SAF (A20). */

/** Public takip yolu; router'daki rota ile aynı olmak zorunda. */
export const TRACK_PATH = 'takip';

export function trackingUrl(origin: string, orderToken: string): string {
  return `${origin.replace(/\/$/, '')}/${TRACK_PATH}/${orderToken}`;
}

/** Müşteriye gidecek takip mesajı. */
export function buildOrderTrackingMessage(params: {
  origin: string;
  orderToken: string;
  customerName?: string | undefined;
}): string {
  const name = params.customerName?.trim();
  const greeting = name ? `Merhaba ${name}, ` : '';
  return `${greeting}siparişinizi buradan takip edebilirsiniz: ${trackingUrl(params.origin, params.orderToken)}`;
}

/**
 * Sipariş formundaki referans kodu.
 *
 * Siparişin resmi numarası `order_no`'dur; bu kod yalnız basılı belgede
 * okunaklı bir başlık olsun diye üretilir.
 */
export function buildOrderReferenceCode(orderNo: string, createdAt: string): string {
  const day = (createdAt.split('T')[0] ?? '').replace(/-/g, '');
  return `SIP-${day || '00000000'}-${orderNo}`;
}
