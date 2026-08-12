import { formatMoney, formatDate } from '@/lib/format';
import type { CustomerLedger, FinanceTransaction, MinimalOrder } from '../api/useFinance';
import {
  computeReturnCreditsByOrder,
  buildChildrenByParent,
  reconstructRootOrderDebt,
} from '../domain/finance';

interface CustomerLedgerDetailProps {
  ledger: CustomerLedger;
  orders: MinimalOrder[];
  transactions: FinanceTransaction[];
}

export function CustomerLedgerDetail({ ledger, orders, transactions }: CustomerLedgerDetailProps) {
  // Get all orders for this customer
  const customerOrders = orders.filter(o => ledger.order_ids.includes(o.id));

  // Get all payments and refunds (transactions) for this customer's orders
  const customerPayments = transactions.filter(t => t.order_id && ledger.order_ids.includes(t.order_id));

  const returnCreditsByOrder = computeReturnCreditsByOrder(customerPayments);
  const childrenByParent = buildChildrenByParent(customerOrders);

  const rootOrders = customerOrders.filter(o => !o.parentOrderId);

  // Combine them into a single timeline
  const timeline = [
    ...rootOrders.map(o => {
      return {
        id: o.id,
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
        id: p.id,
        date: p.created_at || '',
        dateMs: new Date(p.created_at || 0).getTime(),
        label: `${isExpense ? 'İade' : 'Tahsilat'} (${methodLabel}) - ${p.description || ''}`,
        debt: isExpense ? Number(p.amount) : 0,
        credit: isExpense ? 0 : Number(p.amount),
      };
    })
  ].sort((a, b) => a.dateMs - b.dateMs); // Oldest to newest

  let runningBalance = 0;

  return (
    <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl my-2 shadow-inner">
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Hesap Hareketleri Detayı</h4>
      {timeline.length === 0 ? (
        <p className="text-xs text-slate-400">Hareket bulunamadı.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="pb-2 font-bold text-slate-500">Tarih</th>
                <th className="pb-2 font-bold text-slate-500">İşlem</th>
                <th className="pb-2 font-bold text-right text-rose-600">Borç (Sipariş)</th>
                <th className="pb-2 font-bold text-right text-emerald-600">Alacak (Ödeme)</th>
                <th className="pb-2 font-bold text-right text-slate-900">Bakiye</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {timeline.map(item => {
                runningBalance += item.debt - item.credit;
                return (
                  <tr key={item.id} className="hover:bg-slate-100/30">
                    <td className="py-2.5 font-medium text-slate-500">{formatDate(item.date)}</td>
                    <td className="py-2.5 text-slate-700 font-medium">{item.label}</td>
                    <td className="py-2.5 text-right font-semibold text-rose-600">{item.debt > 0 ? formatMoney(item.debt) : '—'}</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-600">{item.credit !== 0 ? formatMoney(item.credit) : '—'}</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">{formatMoney(runningBalance)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
