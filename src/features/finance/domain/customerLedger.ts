import {
  computeReturnCreditsByOrder,
  buildChildrenByParent,
  reconstructRootOrderDebt,
  type FinanceTransaction,
  type MinimalOrder,
} from './finance';

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
  manufacturer_names: string[];
}

/** Müşteriyi ad+telefon ikilisiyle tekilleştirir. */
const ledgerKey = (name: string, phone: string) => `${name}-${phone}`;

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
): CustomerLedger[] {
  if (!orders || !transactions) return [];

  const returnCreditsByOrder = computeReturnCreditsByOrder(transactions);
  const childrenByParent = buildChildrenByParent(orders);
  const ledgers = new Map<string, CustomerLedger>();

  for (const o of orders) {
    if (!o.customerName && !o.customerPhone) continue;

    const name = cleanName(o.customerName);
    const phone = cleanPhone(o.customerPhone);
    const key = ledgerKey(name, phone);

    let entry = ledgers.get(key);
    if (!entry) {
      entry = {
        customer_name: name,
        customer_phone: phone,
        customer_email: null,
        customer_province: null,
        customer_district: null,
        customer_address: o.customerAddress,
        total_order_amount: 0,
        total_paid_amount: 0,
        remaining_balance: 0,
        order_ids: [],
        manufacturer_names: [],
      };
      ledgers.set(key, entry);
    }

    entry.order_ids.push(o.id);
    if (o.manufacturerName && !entry.manufacturer_names.includes(o.manufacturerName)) {
      entry.manufacturer_names.push(o.manufacturerName);
    }

    if (!o.parentOrderId) {
      const debt = reconstructRootOrderDebt(o, childrenByParent, returnCreditsByOrder);
      entry.total_order_amount += debt;
      entry.remaining_balance += debt;
    }
  }

  const orderById = new Map(orders.map((o) => [o.id, o]));

  for (const t of transactions) {
    if (!t.order_id) continue;
    const order = orderById.get(t.order_id);
    if (!order) continue;

    const entry = ledgers.get(ledgerKey(cleanName(order.customerName), cleanPhone(order.customerPhone)));
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

  return [...ledgers.values()].sort((a, b) => b.remaining_balance - a.remaining_balance);
}
