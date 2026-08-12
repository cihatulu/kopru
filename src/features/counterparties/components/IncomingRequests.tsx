import { Button } from '@/components/ui/Button';
import { otherParty, type Edge } from '../domain/counterparty';

interface Props {
  requests: Edge[];
  myOrgId: string;
  busyId?: string | undefined;
  onRespond: (relationshipId: string, accept: boolean) => void;
}

/**
 * Gelen bağlantı istekleri.
 *
 * Köprü çağında bu adım 8 haneli eşleşme kodu, HMAC imzalı secret alışverişi ve
 * idempotency log'u gerektiriyordu. Tek veritabanında geriye tek bir onay kaldı.
 */
export function IncomingRequests({ requests, myOrgId, busyId, onRespond }: Props) {
  if (requests.length === 0) return null;

  return (
    <section className="rounded-xl bg-amber-50 p-5 ring-1 ring-inset ring-amber-200">
      <h3 className="text-sm font-semibold text-amber-900">
        Gelen bağlantı istekleri ({requests.length})
      </h3>
      <p className="mt-1 text-xs text-amber-800">
        Bu firmalar sizi kendi listelerine eklemek istiyor. Onaylarsanız karşılıklı sipariş ve cari
        takibi başlar.
      </p>

      <ul className="mt-4 space-y-2">
        {requests.map((edge) => {
          const party = otherParty(edge, myOrgId);
          return (
            <li
              key={edge.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{party.companyName}</p>
                <p className="font-mono text-xs text-slate-500">{party.vknTc}</p>
                {/* Teklif edilen iskonto onaydan ÖNCE görünmeli: kabul edilen şey bu. */}
                <p className="mt-0.5 text-xs text-slate-500">
                  İlişki iskonto oranı: %{edge.discountRate}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  disabled={busyId === edge.id}
                  onClick={() => onRespond(edge.id, false)}
                >
                  Reddet
                </Button>
                <Button loading={busyId === edge.id} onClick={() => onRespond(edge.id, true)}>
                  Onayla
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
