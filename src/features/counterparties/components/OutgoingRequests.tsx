import { otherParty, type Edge } from '../domain/counterparty';

interface Props {
  requests: Edge[];
  myOrgId: string;
}

/**
 * Gönderdiğimiz, karşı tarafın onayını bekleyen bağlantı istekleri.
 *
 * Yalnız bilgilendirme — bu listede eylem yoktur. İstek ancak karşı taraf
 * abone olduğunda beklemeye düşer; misafir taraf için ilişki anında kurulur.
 */
export function OutgoingRequests({ requests, myOrgId }: Props) {
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
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{party.companyName}</p>
                <p className="font-mono text-xs text-slate-500">{party.vknTc}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Karşı taraf da abone olduğu için onayı bekleniyor.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                Onay Bekliyor
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
