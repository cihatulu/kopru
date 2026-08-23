import { otherParty, type Edge } from '../domain/counterparty';
import { Button } from '@/components/ui/Button';

interface Props {
  requests: Edge[];
  myOrgId: string;
  onShowCredentials?: (edge: Edge) => void;
}

/**
 * Gönderdiğimiz, karşı tarafın onayını bekleyen bağlantı istekleri.
 *
 * Misafir taraf için giriş bilgileri/şifre yenileme eylemi sunulur.
 */
export function OutgoingRequests({ requests, myOrgId, onShowCredentials }: Props) {
  if (requests.length === 0) return null;

  return (
    <section className="rounded-xl bg-blue-50 p-5 ring-1 ring-inset ring-blue-200">
      <h3 className="text-sm font-semibold text-blue-900">
        Bekleyen giden istekler ({requests.length})
      </h3>

      <ul className="mt-4 space-y-2">
        {requests.map((edge) => {
          const party = otherParty(edge, myOrgId);
          return (
            <li
              key={edge.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4 shadow-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{party.companyName}</p>
                <p className="font-mono text-xs text-slate-500">{party.vknTc}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {party.isSubscriber
                    ? 'Karşı taraf da abone olduğu için kendi panelinden onaylaması bekleniyor.'
                    : 'Giriş bilgileriyle sisteme ilk kez girdiğinde otomatik olarak onaylanacaktır.'}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                {!party.isSubscriber && onShowCredentials && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold"
                    onClick={() => onShowCredentials(edge)}
                  >
                    🔑 Giriş Bilgileri / Şifre
                  </Button>
                )}
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  Onay Bekliyor
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
