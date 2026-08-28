import { formatMoney, formatDate } from '@/lib/format';
import type { CustomerLedger, FinanceTransaction, MinimalOrder, MinimalReturnRequest } from '../api/useFinance';
import {
  computeReturnCreditsByOrder,
  buildChildrenByParent,
  reconstructRootOrderDebt,
} from '../domain/finance';

interface CustomerLedgerDetailProps {
  ledger: CustomerLedger;
  orders: MinimalOrder[];
  transactions: FinanceTransaction[];
  returnRequests: MinimalReturnRequest[];
}

export function CustomerLedgerDetail({ ledger, orders, transactions, returnRequests }: CustomerLedgerDetailProps) {
  // Get all orders (roots and their child shipments) for this customer
  const customerOrders = orders.filter(
    (o) => ledger.order_ids.includes(o.id) || (o.parentOrderId && ledger.order_ids.includes(o.parentOrderId)),
  );

  const orderIdSet = new Set(customerOrders.map((o) => o.id));

  // Get all payments and refunds (transactions) for this customer's orders
  const customerPayments = transactions.filter((t) => t.order_id && orderIdSet.has(t.order_id));

  const returnCreditsByOrder = computeReturnCreditsByOrder(customerPayments);
  const childrenByParent = buildChildrenByParent(customerOrders);

  const rootOrders = customerOrders.filter((o) => !o.parentOrderId);

  // Filter return requests for this customer's orders
  const customerReturns = returnRequests.filter((rr) => orderIdSet.has(rr.orderId));

  // Filter cancelled orders/shipments
  const cancelledOrders = customerOrders.filter(o => o.status === 'cancelled');

  // Combine them into a single timeline
  const timeline = [
    ...rootOrders.map(o => {
      return {
        id: `order-${o.id}`,
        date: o.createdAt || '',
        dateMs: new Date(o.createdAt || 0).getTime(),
        label: `Sipariş (${o.manufacturerName || '-'}) - ${o.orderNo}`,
        debt: reconstructRootOrderDebt(o, childrenByParent, returnCreditsByOrder),
        credit: 0,
      };
    }),
    ...customerPayments.map(p => {
      const methodLabel = p.method === 'cash' ? 'Nakit' : p.method === 'pos_own' ? 'Bizim POS' : 'Üretici POS';
      const isExpense = p.type === 'expense';
      return {
        id: `payment-${p.id}`,
        date: p.created_at || '',
        dateMs: new Date(p.created_at || 0).getTime(),
        label: `${isExpense ? 'Geri Ödeme' : 'Tahsilat'} (${methodLabel}) - ${p.description || ''}`,
        debt: isExpense ? Number(p.amount) : 0,
        credit: isExpense ? 0 : Number(p.amount),
      };
    }),
    ...customerReturns.map(cr => {
      const order = customerOrders.find(o => o.id === cr.orderId);
      let refundAmount = 0;
      const itemNames: string[] = [];
      
      for (const item of cr.items) {
        const orderItem = order?.items?.find(oi => oi.id === item.orderItemId);
        if (orderItem) {
          refundAmount += item.quantity * orderItem.retailUnitPrice;
          itemNames.push(`${orderItem.name} (${item.quantity} adet)`);
        }
      }

      return {
        id: `return-${cr.id}`,
        date: cr.decidedAt || '',
        dateMs: new Date(cr.decidedAt || 0).getTime(),
        label: `İade - ${order ? `Sipariş #${order.orderNo}` : ''} ${itemNames.length > 0 ? `[${itemNames.join(', ')}]` : ''}`,
        debt: 0,
        credit: refundAmount,
      };
    }),
    ...cancelledOrders.map(o => {
      const isChild = !!o.parentOrderId;
      return {
        id: `cancel-${o.id}`,
        date: o.updatedAt || o.createdAt || '',
        dateMs: new Date(o.updatedAt || o.createdAt || 0).getTime(),
        label: `İptal - ${isChild ? 'Sevkiyat' : 'Sipariş'} #${o.orderNo}`,
        debt: 0,
        credit: o.totalAmount,
      };
    })
  ].sort((a, b) => a.dateMs - b.dateMs); // Oldest to newest

  let runningBalanceDesktop = 0;
  let runningBalanceMobile = 0;

  return (
    <div className="bg-slate-50/70 p-3 sm:p-4 border border-slate-200/80 rounded-2xl my-2 shadow-inner">
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Hesap Hareketleri Detayı</h4>
      {timeline.length === 0 ? (
        <p className="text-xs text-slate-400">Hareket bulunamadı.</p>
      ) : (
        <>
          {/* 📱 MOBİL GÖRÜNÜM: Zaman Çizelgesi Akıllı Kartları (md altı) */}
          <div className="space-y-2.5 md:hidden">
            {timeline.map(item => {
              runningBalanceMobile += item.debt - item.credit;
              const hasDebt = item.debt > 0;
              const hasCredit = item.credit > 0;

              return (
                <div key={item.id} className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-xs text-xs">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-800 flex-1 leading-snug">
                      {item.label}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                      {formatDate(item.date)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block font-semibold">Tutar:</span>
                      {hasDebt && (
                        <span className="font-black text-red-600 font-mono">
                          +{formatMoney(item.debt)} (Borç)
                        </span>
                      )}
                      {hasCredit && (
                        <span className="font-black text-emerald-700 font-mono">
                          −{formatMoney(item.credit)} (Tahsilat)
                        </span>
                      )}
                      {!hasDebt && !hasCredit && <span className="text-slate-500">—</span>}
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 block font-semibold">Anlık Bakiye:</span>
                      <span className="font-black text-slate-900 font-mono">
                        {formatMoney(runningBalanceMobile)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: Detaylı Tablo (md ve üzeri) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="pb-2 font-bold text-slate-500">Tarih</th>
                  <th className="pb-2 font-bold text-slate-500">İşlem</th>
                  <th className="pb-2 font-bold text-right text-red-600">Borç (Sipariş)</th>
                  <th className="pb-2 font-bold text-right text-emerald-600">Alacak (Ödeme)</th>
                  <th className="pb-2 font-bold text-right text-slate-900">Bakiye</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {timeline.map(item => {
                  runningBalanceDesktop += item.debt - item.credit;
                  return (
                    <tr key={item.id} className="hover:bg-slate-100/30">
                      <td className="py-2.5 font-medium text-slate-500">{formatDate(item.date)}</td>
                      <td className="py-2.5 text-slate-700 font-medium">{item.label}</td>
                      <td className="py-2.5 text-right font-semibold text-red-600">{item.debt > 0 ? formatMoney(item.debt) : '—'}</td>
                      <td className="py-2.5 text-right font-semibold text-emerald-600">{item.credit !== 0 ? formatMoney(item.credit) : '—'}</td>
                      <td className="py-2.5 text-right font-bold text-slate-900">{formatMoney(runningBalanceDesktop)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
