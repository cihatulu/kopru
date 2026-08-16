import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime, formatMoney, formatQuantity } from '@/lib/format';
import type { OrgKind } from '@/constants';
import { canCancel, nextAction } from '../domain/status';
import { OrderStatusBadge } from './OrderStatusBadge';
import type { OrderDetail } from '../domain/orderMapping';

interface Props {
  order: OrderDetail;
  myKind: OrgKind;
  pending: boolean;
  onClose: () => void;
  onAdvance: (to: OrderDetail['status']) => void;
  onCancel: () => void;
}

export function OrderDetailPanel({ order, myKind, pending, onClose, onAdvance, onCancel }: Props) {
  const next = nextAction(order.status, myKind);

  return (
    <Modal
      label={`Sipariş ${order.orderNo}`}
      panelClassName="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      onClose={onClose}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-lg font-bold text-slate-900">{order.orderNo}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {order.counterpartyName} · {formatDateTime(order.createdAt)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead className="border-b border-slate-200">
          <tr>
            <th className="py-2 text-left text-xs font-semibold text-slate-500">Ürün</th>
            <th className="py-2 text-right text-xs font-semibold text-slate-500">Adet</th>
            <th className="py-2 text-right text-xs font-semibold text-slate-500">Birim</th>
            <th className="py-2 text-right text-xs font-semibold text-slate-500">Tutar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {order.items.map((i) => (
            <tr key={i.id}>
              <td className="py-2.5">
                {/* Model kodu yazılmaz — ürün adının içinde zaten var. */}
                <span className="block text-slate-900">{i.name}</span>
              </td>
              <td className="py-2.5 text-right text-slate-700">{formatQuantity(i.quantity)}</td>
              <td className="py-2.5 text-right text-slate-700">
                {formatMoney(i.supplierUnitPrice)}
              </td>
              <td className="py-2.5 text-right font-medium text-slate-900">
                {formatMoney(i.totalPrice)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-slate-200">
          <tr>
            <td colSpan={3} className="py-3 text-right text-sm font-medium text-slate-600">
              Toplam
            </td>
            <td className="py-3 text-right text-base font-bold text-slate-900">
              {formatMoney(order.totalAmount)}
            </td>
          </tr>
        </tfoot>
      </table>

      {order.customerName && (
        <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm">
          <p className="text-xs font-semibold text-slate-500">Son müşteri</p>
          <p className="mt-1 text-slate-900">{order.customerName}</p>
          {order.customerPhone && <p className="text-slate-600">{order.customerPhone}</p>}
          {order.customerAddress && <p className="mt-1 text-slate-600">{order.customerAddress}</p>}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Kapat
        </Button>
        {canCancel(order.status) && (
          <Button variant="ghost" loading={pending} onClick={onCancel}>
            İptal et
          </Button>
        )}
        {next && (
          <Button loading={pending} onClick={() => onAdvance(next.to)}>
            {next.label}
          </Button>
        )}
      </div>
    </Modal>
  );
}
