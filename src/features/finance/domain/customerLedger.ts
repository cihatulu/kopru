import {
  computeReturnCreditsByOrder,
  buildChildrenByParent,
  reconstructRootOrderDebt,
  type FinanceTransaction,
  type MinimalOrder,
  type MinimalReturnRequest,
} from './finance';

export interface CustomerOrderSummary {
  id: string;
  orderNo: string;
  orderToken: string | null;
  manufacturerName: string | null;
}

/** Bir müşterinin (perakendecinin kendi müşterisi) borç/ödeme özeti. */
export interface CustomerLedger {
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  customer_province?: string | null;
  customer_district?: string | null;
  customer_address?: string | null;
  total_order_amount: number;
  total_paid_amount: number;
  remaining_balance: number;
  order_ids: string[];
  orders_info?: CustomerOrderSummary[];
  manufacturer_names: string[];
}

const clean = (v: string | null | undefined) => (v || '').trim().toLowerCase();

/**
 * Müşteriyi Ad, Telefon, İl, İlçe ve Adres bileşeniyle tekilleştirir.
 * Birebir aynı bilgilere sahip olanlar tek caride toplanır, farklı olanlar ayrılır.
 */
export const customerLedgerKey = (
  l: {
    customer_name?: string | null | undefined;
    customer_phone?: string | null | undefined;
    customer_province?: string | null | undefined;
    customer_district?: string | null | undefined;
    customer_address?: string | null | undefined;
  },
): string => {
  return [
    clean(l.customer_name),
    clean(l.customer_phone),
    clean(l.customer_province),
    clean(l.customer_district),
    clean(l.customer_address),
  ].join('||');
};

const cleanName = (v: string | null) => (v || 'İsimsiz').trim();
const cleanPhone = (v: string | null) => (v || '').trim();

/**
 * Sipariş ve defter satırlarından müşteri carilerini kurar.
 *
 * Borç YALNIZ kök siparişlerden hesaplanır: kısmi sevkiyatta oluşan alt
 * siparişler kökün tutarına zaten dahildir, ayrıca sayılırsa borç iki katına
 * çıkar. `reconstructRootOrderDebt` kökün altındaki çocukları ve iade
 * alacaklarını birlikte değerlendirir.
 *
 * `useCustomerLedgers` adıyla api/ altında yaşıyordu; içinde sorgu yok,
 * tamamı saf hesaplama olduğu için buraya taşındı (A20).
 */
export function buildCustomerLedgers(
  orders: readonly MinimalOrder[] | undefined,
  transactions: readonly FinanceTransaction[] | undefined,
  returnRequests: readonly MinimalReturnRequest[] | undefined = [],
): CustomerLedger[] {
  if (!orders || !transactions) return [];

  const returnCreditsByOrder = computeReturnCreditsByOrder(transactions);
  const childrenByParent = buildChildrenByParent(orders);
  const ledgers = new Map<string, CustomerLedger>();

  // 1. Önce KÖK siparişlerden müşteri carileri oluşturulur
  for (const o of orders) {
    if (o.parentOrderId) continue; // Alt siparişler (kısmi sevkiyat) ayrı müşteri carisi AÇAMAZ
    if (!o.customerName && !o.customerPhone) continue;

    const name = cleanName(o.customerName);
    const phone = cleanPhone(o.customerPhone);
    const key = customerLedgerKey({
      customer_name: name,
      customer_phone: phone,
      customer_province: o.customerProvince,
      customer_district: o.customerDistrict,
      customer_address: o.customerAddress,
    });

    let entry = ledgers.get(key);
    if (!entry) {
      entry = {
        customer_name: name,
        customer_phone: phone,
        customer_email: o.customerEmail || null,
        customer_province: o.customerProvince || null,
        customer_district: o.customerDistrict || null,
        customer_address: o.customerAddress || null,
        total_order_amount: 0,
        total_paid_amount: 0,
        remaining_balance: 0,
        order_ids: [],
        orders_info: [],
        manufacturer_names: [],
      };
      ledgers.set(key, entry);
    } else {
      if (!entry.customer_email && o.customerEmail) entry.customer_email = o.customerEmail;
      if (!entry.customer_province && o.customerProvince) entry.customer_province = o.customerProvince;
      if (!entry.customer_district && o.customerDistrict) entry.customer_district = o.customerDistrict;
      if (!entry.customer_address && o.customerAddress) entry.customer_address = o.customerAddress;
    }

    if (!entry.order_ids.includes(o.id)) {
      entry.order_ids.push(o.id);
    }
    if (o.manufacturerName && !entry.manufacturer_names.includes(o.manufacturerName)) {
      entry.manufacturer_names.push(o.manufacturerName);
    }

    const debt = reconstructRootOrderDebt(o, childrenByParent, returnCreditsByOrder);
    entry.total_order_amount += debt;
    entry.remaining_balance += debt;

    if (entry.orders_info && !entry.orders_info.some((info) => info.id === o.id)) {
      entry.orders_info.push({
        id: o.id,
        orderNo: o.orderNo,
        orderToken: o.orderToken || null,
        manufacturerName: o.manufacturerName || null,
      });
    }
  }

  // 2. Alt siparişlerin (kısmi sevkiyat / child orders) kimlikleri kök siparişin carisine eklenir
  for (const o of orders) {
    if (!o.parentOrderId) continue;
    // Kök siparişi bul ve onun carisine child ID'sini bağla
    for (const entry of ledgers.values()) {
      if (entry.order_ids.includes(o.parentOrderId)) {
        if (!entry.order_ids.includes(o.id)) {
          entry.order_ids.push(o.id);
        }
        if (o.manufacturerName && !entry.manufacturer_names.includes(o.manufacturerName)) {
          entry.manufacturer_names.push(o.manufacturerName);
        }
        break;
      }
    }
  }

  const orderById = new Map(orders.map((o) => [o.id, o]));

  for (const t of transactions) {
    if (!t.order_id) continue;
    const order = orderById.get(t.order_id);
    if (!order) continue;

    const key = customerLedgerKey({
      customer_name: cleanName(order.customerName),
      customer_phone: cleanPhone(order.customerPhone),
      customer_province: order.customerProvince,
      customer_district: order.customerDistrict,
      customer_address: order.customerAddress,
    });
    const entry = ledgers.get(key);
    if (!entry) continue;

    const amt = Number(t.amount);
    if (t.type === 'income') {
      entry.total_paid_amount += amt;
      entry.remaining_balance -= amt;
    } else if (t.type === 'expense') {
      entry.total_order_amount += amt;
      entry.remaining_balance += amt;
    }
  }

  // İadelerden kaynaklı alacak kayıtları
  if (returnRequests) {
    for (const rr of returnRequests) {
      const order = orderById.get(rr.orderId);
      if (!order) continue;

      const key = customerLedgerKey({
        customer_name: cleanName(order.customerName),
        customer_phone: cleanPhone(order.customerPhone),
        customer_province: order.customerProvince,
        customer_district: order.customerDistrict,
        customer_address: order.customerAddress,
      });
      const entry = ledgers.get(key);
      if (!entry) continue;

      let refundAmount = 0;
      for (const item of rr.items) {
        const orderItem = order.items?.find((oi) => oi.id === item.orderItemId);
        if (orderItem) {
          refundAmount += item.quantity * orderItem.retailUnitPrice;
        }
      }

      if (refundAmount > 0) {
        entry.total_paid_amount += refundAmount;
        entry.remaining_balance -= refundAmount;
      }
    }
  }

  // İptallerden kaynaklı alacak kayıtları
  for (const o of orders) {
    if (o.status === 'cancelled') {
      const key = customerLedgerKey({
        customer_name: cleanName(o.customerName),
        customer_phone: cleanPhone(o.customerPhone),
        customer_province: o.customerProvince,
        customer_district: o.customerDistrict,
        customer_address: o.customerAddress,
      });
      const entry = ledgers.get(key);
      if (!entry) continue;

      entry.total_paid_amount += o.totalAmount;
      entry.remaining_balance -= o.totalAmount;
    }
  }

  return [...ledgers.values()].sort((a, b) => b.remaining_balance - a.remaining_balance);
}
