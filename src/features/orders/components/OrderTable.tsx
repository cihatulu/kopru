import { formatDateTime, formatMoney } from '@/lib/format';
import { ORDER_STATUS_META } from '../domain/status';
import type { OrderRow } from '../api/useOrders';

interface Props {
  orders: OrderRow[];
  onSelect: (order: OrderRow) => void;
}

const TH = 'px-4 py-2.5 text-left text-xs font-semibold text-slate-500';
const TD = 'px-4 py-3 align-middle';

export function OrderStatusBadge({ status }: { status: OrderRow['status'] }) {
  const meta = ORDER_STATUS_META[status];
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export function OrderTable({ orders, onSelect }: Props) {
  if (orders.length === 0) {
    return (
      <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
        Henüz sipariş yok.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-inset ring-slate-200">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className={TH}>Sipariş</th>
            <th className={TH}>Karşı taraf</th>
            <th className={TH}>Durum</th>
            <th className={`${TH} text-right`}>Tutar</th>
            <th className={TH}>Tarih</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map((o) => (
            <tr
              key={o.id}
              onClick={() => onSelect(o)}
              className="cursor-pointer hover:bg-slate-50/60"
            >
              <td className={`${TD} font-mono text-xs font-medium text-slate-900`}>{o.orderNo}</td>
              <td className={`${TD} text-slate-700`}>{o.counterpartyName}</td>
              <td className={TD}>
                <OrderStatusBadge status={o.status} />
              </td>
              <td className={`${TD} text-right font-medium text-slate-900`}>
                {formatMoney(o.totalAmount)}
              </td>
              <td className={`${TD} text-xs text-slate-500`}>{formatDateTime(o.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
