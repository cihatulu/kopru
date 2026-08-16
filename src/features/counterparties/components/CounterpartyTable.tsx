import { TH, THEAD } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { RelationshipBadge, SubscriberBadge } from '@/features/admin';
import {
  isManufacturerSide,
  isOutgoingRequest,
  otherParty,
  pendingExplanation,
  type Edge,
} from '../domain/counterparty';

interface Props {
  edges: Edge[];
  myOrgId: string;
  busyId?: string | undefined;
  onToggleStatus: (edge: Edge) => void;
}

const TD = 'px-4 py-3 align-middle';

export function CounterpartyTable({ edges, myOrgId, busyId, onToggleStatus }: Props) {
  if (edges.length === 0) {
    return (
      <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
        Henüz kayıt yok. Vergi numarasıyla ekleyerek başlayın.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-inset ring-slate-200">
      <table className="w-full min-w-[680px] border-collapse text-sm">
        <thead className={THEAD}>
          <tr>
            <th className={TH}>Firma</th>
            <th className={TH}>Durum</th>
            <th className={TH}>İskonto</th>
            <th className={`${TH} text-right`}>İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {edges.map((edge) => {
            const party = otherParty(edge, myOrgId);
            const pending = edge.status === 'pending';
            return (
              <tr key={edge.id} className="hover:bg-slate-50/60">
                <td className={TD}>
                  <span className="block font-medium text-slate-900">{party.companyName}</span>
                  <span className="block font-mono text-xs text-slate-500">{party.vknTc}</span>
                  {pending && (
                    <span className="mt-1 block text-xs text-amber-700">
                      {pendingExplanation(edge, myOrgId)}
                    </span>
                  )}
                </td>
                <td className={TD}>
                  <div className="flex flex-wrap gap-1.5">
                    <RelationshipBadge status={edge.status} />
                    <SubscriberBadge isSubscriber={party.isSubscriber} plan={null} />
                  </div>
                </td>
                <td className={`${TD} text-slate-600`}>
                  {isManufacturerSide(edge, myOrgId) ? `%${edge.discountRate}` : '—'}
                </td>
                <td className={`${TD} text-right`}>
                  {isOutgoingRequest(edge, myOrgId) ? (
                    <span className="text-xs text-slate-400">Yanıt bekleniyor</span>
                  ) : pending ? (
                    <span className="text-xs text-slate-400">Yukarıdan yanıtlayın</span>
                  ) : (
                    <Button
                      variant={edge.status === 'active' ? 'ghost' : 'primary'}
                      loading={busyId === edge.id}
                      onClick={() => onToggleStatus(edge)}
                    >
                      {edge.status === 'active' ? 'Pasifleştir' : 'Aktifleştir'}
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
