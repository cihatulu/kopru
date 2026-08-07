import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/format';
import { SSH_STATUS_META, isSshClosed, nextSshStatus } from '../domain/labels';
import type { SshRequest } from '../api/useSshRequests';

interface Props {
  requests: SshRequest[];
  myOrgId: string;
  busyId?: string | undefined;
  onAdvance: (r: SshRequest) => void;
  onCancel: (r: SshRequest) => void;
}

export function SshList({ requests, myOrgId, busyId, onAdvance, onCancel }: Props) {
  if (requests.length === 0) {
    return (
      <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
        Servis talebi yok.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {requests.map((r) => {
        const meta = SSH_STATUS_META[r.status];
        // Servis akışını yalnız üretici ilerletir; perakendeci iptal edebilir.
        const iAmManufacturer = r.manufacturerOrgId === myOrgId;
        const next = iAmManufacturer ? nextSshStatus(r.status) : null;

        return (
          <li
            key={r.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-white p-5 ring-1 ring-inset ring-slate-200"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-900">{r.title}</p>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}
                >
                  {meta.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {r.counterpartyName} · {formatDateTime(r.createdAt)}
                {r.customerName && ` · Müşteri: ${r.customerName}`}
              </p>
              {r.description && (
                <p className="mt-2 max-w-2xl text-sm text-slate-600">{r.description}</p>
              )}
            </div>

            {!isSshClosed(r.status) && (
              <div className="flex gap-2">
                <Button variant="ghost" disabled={busyId === r.id} onClick={() => onCancel(r)}>
                  İptal
                </Button>
                {next && (
                  <Button loading={busyId === r.id} onClick={() => onAdvance(r)}>
                    {SSH_STATUS_META[next].label}
                  </Button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
