import { Button } from '@/components/ui/Button';
import { formatDateTime, formatMoney } from '@/lib/format';
import { RETURN_STATUS_META } from '../domain/labels';
import type { ReturnRequest } from '../api/useReturnRequests';

interface Props {
  requests: ReturnRequest[];
  myOrgId: string;
  busyId?: string | undefined;
  onDecide: (r: ReturnRequest, approve: boolean) => void;
}

export function ReturnList({ requests, myOrgId, busyId, onDecide }: Props) {
  if (requests.length === 0) {
    return (
      <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
        İade talebi yok.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {requests.map((r) => {
        const meta = RETURN_STATUS_META[r.status];
        // Kararı malı gönderen taraf verir.
        const canDecide = r.status === 'pending' && r.manufacturerOrgId === myOrgId;

        return (
          <li
            key={r.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-white p-5 ring-1 ring-inset ring-slate-200"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-sm font-medium text-slate-900">{r.orderNo}</p>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}
                >
                  {meta.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {r.counterpartyName} · {formatDateTime(r.createdAt)}
              </p>
              {r.reason && <p className="mt-2 max-w-2xl text-sm text-slate-600">{r.reason}</p>}
              {r.approvedAmount !== null && (
                <p className="mt-1 text-sm font-medium text-slate-900">
                  İade tutarı: {formatMoney(r.approvedAmount)}
                </p>
              )}
            </div>

            {canDecide && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  disabled={busyId === r.id}
                  onClick={() => onDecide(r, false)}
                >
                  Reddet
                </Button>
                <Button loading={busyId === r.id} onClick={() => onDecide(r, true)}>
                  Onayla
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
