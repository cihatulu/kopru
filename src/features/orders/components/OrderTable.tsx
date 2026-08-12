import React, { useState } from 'react';
import { formatDate, formatMoney } from '@/lib/format';
import type { OrderStatus } from '../domain/status';
import type { OrderRow } from '../domain/orderMapping';
import type { OrgKind } from '@/constants';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderStatusCell } from './OrderStatusCell';
import { OrderExpandedDetail } from './OrderExpandedDetail';

interface Props {
  orders: OrderRow[];
  myKind: OrgKind;
  myOrgId: string;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  updatingOrderId: string | null;
}

const TH = 'px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500 bg-slate-50';
const TD = 'px-6 py-4.5 align-middle whitespace-nowrap text-sm';

/** Üreticinin durumu elle değiştirebildiği aşamalar. */
const EDITABLE: readonly OrderStatus[] = [
  'pending',
  'confirmed',
  'in_production',
  'partially_shipped',
  'shipped',
];

export function OrderTable({ orders, myKind, myOrgId, onUpdateStatus, updatingOrderId }: Props) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<Record<string, OrderStatus>>({});

  if (orders.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm italic text-slate-500 shadow-sm">
        Henüz sipariş yok.
      </p>
    );
  }

  const isMfr = myKind === 'manufacturer';

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full min-w-[960px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className={TH}>Sipariş No</th>
            <th className={TH}>Tarih</th>
            <th className={TH}>Tutar</th>
            <th className={TH}>{isMfr ? 'Perakendeci' : 'Tedarikçi'}</th>
            <th className={TH}>Son Kullanıcı</th>
            <th className={TH}>Durum</th>
            <th className={`${TH} text-right pr-8`}>İşlemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map((o) => {
            const isExpanded = expandedOrderId === o.id;

            return (
              <React.Fragment key={o.id}>
                <tr className="transition-colors hover:bg-slate-50/40">
                  <td className={`${TD} font-mono font-bold text-slate-900`}>
                    <div className="flex items-center gap-2">
                      <span>{o.orderNo}</span>
                      {o.status === 'partially_shipped' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                          Bakiyesi Var
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`${TD} text-slate-500`}>{formatDate(o.createdAt)}</td>
                  <td className={`${TD} font-extrabold text-slate-900`}>{formatMoney(o.totalAmount)}</td>
                  <td className={`${TD} font-medium text-slate-700`}>{o.counterpartyName}</td>
                  <td className={`${TD} font-medium text-slate-700`}>{o.customerName || '—'}</td>
                  <td className={TD}>
                    {isMfr && EDITABLE.includes(o.status) ? (
                      <OrderStatusCell
                        status={o.status}
                        selected={selectedStatuses[o.id]}
                        pending={updatingOrderId === o.id}
                        isRoot={!o.parentOrderId}
                        onSelect={(s) => setSelectedStatuses((prev) => ({ ...prev, [o.id]: s }))}
                        onUpdate={(s) => onUpdateStatus(o.id, s)}
                        onPartialShip={() => onUpdateStatus(o.id, 'shipped')}
                      />
                    ) : (
                      <OrderStatusBadge status={o.status} />
                    )}
                  </td>
                  <td className={`${TD} text-right pr-8`}>
                    <div className="flex justify-end gap-2 items-center">
                      {!isMfr && (o.status === 'shipped' || o.status === 'partially_shipped') && (
                        <button
                          type="button"
                          disabled={updatingOrderId === o.id}
                          onClick={() => onUpdateStatus(o.id, 'delivered')}
                          className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold transition-all hover:bg-emerald-700 shadow-sm cursor-pointer"
                        >
                          Teslim Aldım
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors border cursor-pointer ${
                          isExpanded
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>Detay</span>
                        <svg
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>

                {isExpanded && (
                  <tr className="bg-slate-50/30">
                    <td colSpan={7} className="px-6 py-6 border-t border-slate-100">
                      <OrderExpandedDetail orderId={o.id} orgId={myOrgId} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
