import { formatDate, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { useDecideRequest, type PendingRequest } from '../api/useAccounts';

interface Props {
  requests: PendingRequest[];
  /** Kendi org kimliği — kimin istediğini ayırt etmek için. */
  myOrgId: string;
  /** Onayla/Reddet göster: karşı taraftan gelen istekler için. */
  canDecide: boolean;
  counterpartyName: string;
}

/**
 * Bekleyen onay istekleri paneli.
 *
 * İki bölüm:
 *   • Karşı tarafın talepleri → onayla / reddet butonu var (canDecide ise)
 *   • Benim açtıklarım        → "karşı tarafın onayı bekleniyor" bilgisi
 *
 * Her onay/red kararı sunucuda atomik olarak işlenir; hata olursa panel
 * yeniden yüklenmez, hata mesajı gösterilir.
 */
export function PendingRequestsPanel({ requests, myOrgId, canDecide, counterpartyName }: Props) {
  const decide = useDecideRequest();

  if (requests.length === 0) return null;

  const fromCounterparty = requests.filter((r) => r.requestingOrgId !== myOrgId);
  const fromMe           = requests.filter((r) => r.requestingOrgId === myOrgId);

  return (
    <div className="space-y-3">
      {fromCounterparty.length > 0 && (
        <section aria-label="Onay bekleyen istekler">
          <h4 className="mb-2 text-[10px] font-black uppercase tracking-wide text-amber-700">
            {counterpartyName} — Onay Bekliyor
          </h4>
          <ul className="space-y-2">
            {fromCounterparty.map((req) => (
              <li
                key={req.id}
                className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">{req.description}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{formatDate(req.createdAt)}</p>
                  </div>
                  <p
                    className={`shrink-0 text-base font-extrabold ${
                      req.type === 'debit' ? 'text-emerald-600' : 'text-blue-600'
                    }`}
                  >
                    {formatMoney(req.amount)}
                  </p>
                </div>

                {canDecide && (
                  <div className="flex gap-2">
                    <Button
                      id={`approve-${req.id}`}
                      className="flex-1 justify-center bg-emerald-600 hover:bg-emerald-700"
                      loading={decide.isPending}
                      onClick={() => decide.mutate({ requestId: req.id, approve: true })}
                    >
                      Onayla
                    </Button>
                    <Button
                      id={`reject-${req.id}`}
                      variant="secondary"
                      className="flex-1 justify-center text-red-600 hover:bg-red-50"
                      loading={decide.isPending}
                      onClick={() => decide.mutate({ requestId: req.id, approve: false })}
                    >
                      Reddet
                    </Button>
                  </div>
                )}

                {decide.isError && (
                  <p role="alert" className="text-xs text-red-600">
                    İşlem gerçekleştirilemedi. Tekrar deneyin.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {fromMe.length > 0 && (
        <section aria-label="Gönderilmiş istekler">
          <h4 className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
            Sizin Talepleriniz — Onay Bekleniyor
          </h4>
          <ul className="space-y-2">
            {fromMe.map((req) => (
              <li
                key={req.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700">{req.description}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{formatDate(req.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="text-sm font-bold text-slate-800">{formatMoney(req.amount)}</p>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
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
