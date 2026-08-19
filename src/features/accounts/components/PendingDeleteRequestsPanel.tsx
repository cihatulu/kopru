import { formatDate, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { useDecideDeleteRequest, type PendingDeleteRequest } from '../api/useManualTransactionRequests';

interface Props {
  requests: PendingDeleteRequest[];
  myOrgId: string;
  canDecide: boolean;
  counterpartyName: string;
}

export function PendingDeleteRequestsPanel({
  requests,
  myOrgId,
  canDecide,
  counterpartyName,
}: Props) {
  const decide = useDecideDeleteRequest();

  if (requests.length === 0) return null;

  const fromCounterparty = requests.filter((r) => r.requestingOrgId !== myOrgId);
  const fromMe           = requests.filter((r) => r.requestingOrgId === myOrgId);

  return (
    <div className="space-y-3">
      {fromCounterparty.length > 0 && (
        <section aria-label="Onay bekleyen silme istekleri">
          <h4 className="mb-2 text-[10px] font-black uppercase tracking-wide text-red-700">
            {counterpartyName} — Silme Talebi Gönderdi
          </h4>
          <ul className="space-y-2">
            {fromCounterparty.map((req) => (
              <li
                key={req.id}
                className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50/50 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Silinmek İstenen İşlem</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{req.transactionDescription}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{formatDate(req.createdAt)}</p>
                  </div>
                  <p
                    className={`shrink-0 text-base font-extrabold ${
                      req.transactionType === 'debit' ? 'text-emerald-600' : 'text-blue-600'
                    }`}
                  >
                    {formatMoney(req.transactionAmount)}
                  </p>
                </div>

                {canDecide && (
                  <div className="flex gap-2">
                    <Button
                      id={`approve-delete-${req.id}`}
                      className="flex-1 justify-center bg-red-600 hover:bg-red-700 text-white"
                      loading={decide.isPending}
                      onClick={() => decide.mutate({ requestId: req.id, approve: true })}
                    >
                      Silmeyi Onayla
                    </Button>
                    <Button
                      id={`reject-delete-${req.id}`}
                      variant="secondary"
                      className="flex-1 justify-center text-slate-700 hover:bg-slate-100"
                      loading={decide.isPending}
                      onClick={() => decide.mutate({ requestId: req.id, approve: false })}
                    >
                      Reddet
                    </Button>
                  </div>
                )}

                {decide.isError && (
                  <p role="alert" className="text-xs text-red-600 font-bold">
                    Silme onayı gerçekleştirilemedi. Tekrar deneyin.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {fromMe.length > 0 && (
        <section aria-label="Gönderilmiş silme istekleri">
          <h4 className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
            Sizin Silme Talepleriniz — Onay Bekleniyor
          </h4>
          <ul className="space-y-2">
            {fromMe.map((req) => (
              <li
                key={req.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50/20 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700">{req.transactionDescription}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{formatDate(req.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="text-sm font-bold text-slate-800">{formatMoney(req.transactionAmount)}</p>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
                    Bekliyor
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
