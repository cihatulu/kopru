import { TH, THEAD } from '@/components/ui/Table';
import React from 'react';
import { formatMoney } from '@/lib/format';
import { CustomerLedgerDetail } from './CustomerLedgerDetail';
import { customerLedgerKey, type CustomerLedger } from '../domain/customerLedger';
import type { FinanceTransaction, MinimalOrder, MinimalReturnRequest } from '../domain/finance';

const TD = 'px-5 py-3.5 text-sm';

interface Props {
  ledgers: CustomerLedger[];
  orders: MinimalOrder[];
  transactions: FinanceTransaction[];
  returnRequests: MinimalReturnRequest[];
  expandedKeys: string[];
  isEmpty: boolean;
  onToggle: (key: string) => void;
  onShowCustomer: (ledger: CustomerLedger) => void;
}

export function CustomerLedgerTable({
  ledgers,
  orders,
  transactions,
  returnRequests,
  expandedKeys,
  isEmpty,
  onToggle,
  onShowCustomer,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead className={THEAD}>
          <tr className="border-b border-slate-100">
            <th className={TH}>Müşteri Adı</th>
            <th className={TH}>Müşteri Telefonu</th>
            <th className={TH}>Üretici Adı</th>
            <th className={TH}>Sipariş No</th>
            <th className={`${TH} text-right text-red-600`}>Borç (Sipariş)</th>
            <th className={`${TH} text-right text-emerald-600`}>Alacak (Ödeme)</th>
            <th className={`${TH} text-right`}>Bakiye</th>
            <th className={`${TH} w-[150px] text-right pr-6`}>İşlemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ledgers.map((l) => {
            const key = customerLedgerKey(l);
            const isExpanded = expandedKeys.includes(key);
            const orderNos = orders
              .filter((o) => l.order_ids.includes(o.id))
              .map((o) => o.orderNo)
              .join(', ');

            return (
              <React.Fragment key={key}>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className={`${TD} font-semibold text-slate-800`}>{l.customer_name}</td>
                  <td className={`${TD} text-slate-500`}>{l.customer_phone || '—'}</td>
                  <td className={`${TD} text-slate-600`}>{l.manufacturer_names.join(', ') || '—'}</td>
                  <td className={`${TD} font-mono font-bold text-slate-800`}>{orderNos || '—'}</td>
                  <td className={`${TD} text-right font-semibold text-red-600`}>
                    {l.total_order_amount > 0 ? formatMoney(l.total_order_amount) : '—'}
                  </td>
                  <td className={`${TD} text-right font-semibold text-emerald-600`}>
                    {l.total_paid_amount > 0 ? formatMoney(l.total_paid_amount) : '—'}
                  </td>
                  <td className={`${TD} text-right font-bold text-slate-900`}>
                    {formatMoney(l.remaining_balance)}
                  </td>
                  <td className={`${TD} text-right pr-6`}>
                    <div className="flex justify-end gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => onShowCustomer(l)}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                      >
                        Müşteri Bilgileri
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggle(key)}
                        className="text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors cursor-pointer"
                      >
                        {isExpanded ? 'Detay Kapat' : 'Detay Aç'}
                      </button>
                    </div>
                  </td>
                </tr>

                {isExpanded && (
                  <tr>
                    <td colSpan={8} className="px-5 py-2 bg-slate-50/30">
                      <CustomerLedgerDetail
                        ledger={l}
                        orders={orders}
                        transactions={transactions}
                        returnRequests={returnRequests}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}

          {isEmpty && (
            <tr>
              <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                Müşteri carisi bulunmuyor.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
