import { useState } from 'react';
import {
  suggestSubdomain,
  useDecideSubscriptionRequest,
  usePendingSubscriptionRequests,
} from '@/features/admin';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { PLAN, type Plan } from '@/constants';

/** Misafirlerin "kendi panelimi açmak istiyorum" talepleri — tek tıkla onay. */
export default function AdminRequestsPage() {
  const { data: requests, isPending } = usePendingSubscriptionRequests();
  const decide = useDecideSubscriptionRequest();
  const [busyId, setBusyId] = useState<string | null>(null);

  const approve = (id: string, plan: Plan, companyName: string) => {
    setBusyId(id);
    decide.mutate(
      { requestId: id, approve: true, plan, subdomain: suggestSubdomain(companyName) },
      { onSettled: () => setBusyId(null) },
    );
  };

  const reject = (id: string) => {
    setBusyId(id);
    decide.mutate({ requestId: id, approve: false }, { onSettled: () => setBusyId(null) });
  };

  if (isPending) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Abonelik Talepleri</h2>
        <p className="mt-1 text-sm text-slate-500">
          Onay, organizasyonu aboneye yükseltir. Mevcut ticari ilişkileri ve geçmişi korunur.
        </p>
      </div>

      {!requests?.length ? (
        <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
          Bekleyen talep yok.
        </p>
      ) : (
        <ul className="space-y-3">
          {requests.map((req) => (
            <li
              key={req.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-xl bg-white p-5 ring-1 ring-inset ring-slate-200"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{req.org.companyName}</p>
                <p className="mt-0.5 font-mono text-xs text-slate-500">
                  {req.org.vknTc} · {req.org.kind === 'manufacturer' ? 'Üretici' : 'Perakendeci'}
                </p>
                {req.note && <p className="mt-2 text-sm text-slate-600">{req.note}</p>}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  disabled={busyId === req.id}
                  onClick={() => reject(req.id)}
                >
                  Reddet
                </Button>
                <Button
                  loading={busyId === req.id}
                  onClick={() =>
                    approve(req.id, req.requestedPlan ?? PLAN.basic, req.org.companyName)
                  }
                >
                  Onayla ({req.requestedPlan ?? PLAN.basic})
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
