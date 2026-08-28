import { useState } from 'react';
import {
  AddCounterpartyDialog,
  CounterpartyTable,
  IncomingRequests,
  SubscriptionBanner,
  counterpartyNoun,
  counterpartyTitle,
  isIncomingRequest,
  useAddCounterparty,
  useCounterparties,
  useRequestSubscription,
  useRespondToConnection,
  useSetCounterpartyStatus,
  type AddCounterpartyForm,
  type AddCounterpartyResult,
  type Edge,
} from '@/features/counterparties';
import { InvitationsPanel } from '@/features/invitations';
import { useAuthSession } from '@/features/auth';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

/** Müşterilerim / Tedarikçilerim — YALNIZ KOMPOZİSYON (A20). */
export default function CounterpartiesPage() {
  const { data: user } = useAuthSession();
  const list = useCounterparties();
  const add = useAddCounterparty();
  const respond = useRespondToConnection();
  const setStatus = useSetCounterpartyStatus();
  const requestSubscription = useRequestSubscription();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [result, setResult] = useState<AddCounterpartyResult | null>(null);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  const org = user?.org;
  if (!org) return null;

  const edges: Edge[] = (list.data?.pages.flat() ?? []).filter(
    (e) => e.retailer.id === org.id || e.manufacturerOrgId === org.id,
  );
  const incoming = edges.filter((e) => isIncomingRequest(e, org.id));

  const closeDialog = () => {
    setDialogOpen(false);
    setResult(null);
    add.reset();
  };

  const submitAdd = (values: AddCounterpartyForm) => {
    add.mutate(
      {
        vknTc: values.vknTc,
        ...(values.companyName ? { companyName: values.companyName } : {}),
        ...(values.email ? { email: values.email } : {}),
        ...(values.phone ? { phone: values.phone } : {}),
        ...(values.authorizedName ? { authorizedName: values.authorizedName } : {}),
        discountRate: Number(values.discountRate ?? 0),
      },
      { onSuccess: setResult },
    );
  };

  const toggleStatus = (edge: Edge) => {
    setBusyId(edge.id);
    setStatus.mutate(
      { relationshipId: edge.id, status: edge.status === 'active' ? 'passive' : 'active' },
      { onSettled: () => setBusyId(undefined) },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{counterpartyTitle(org.kind)}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Vergi numarasıyla {counterpartyNoun(org.kind)} ekleyin. Firma sistemde kayıtlıysa mevcut
            kaydına bağlanılır; kopya kayıt açılmaz.
          </p>
        </div>
        {org.isSubscriber && <Button onClick={() => setDialogOpen(true)}>Yeni ekle</Button>}
      </div>

      {!org.isSubscriber && (
        <SubscriptionBanner
          pending={requestSubscription.isPending}
          requested={requestSubscription.isSuccess}
          onRequest={() => requestSubscription.mutate({})}
        />
      )}

      <IncomingRequests
        requests={incoming}
        myOrgId={org.id}
        busyId={respond.isPending ? busyId : undefined}
        onRespond={(relationshipId, accept) => {
          setBusyId(relationshipId);
          respond.mutate({ relationshipId, accept }, { onSettled: () => setBusyId(undefined) });
        }}
      />

      {list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <CounterpartyTable
          edges={edges}
          myOrgId={org.id}
          busyId={busyId}
          onToggleStatus={toggleStatus}
        />
      )}

      {/* Davet, karşı taraf eklemenin ikinci yolu — yalnız aboneler gönderir. */}
      {org.isSubscriber && <InvitationsPanel myKind={org.kind} />}

      {list.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            loading={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
          >
            Daha fazla yükle
          </Button>
        </div>
      )}

      {dialogOpen && (
        <AddCounterpartyDialog
          myKind={org.kind}
          myVknTc={org.vknTc}
          pending={add.isPending}
          result={result}
          errorMessage={
            add.isError ? 'Eklenemedi. Bilgileri kontrol edip tekrar deneyin.' : undefined
          }
          onClose={closeDialog}
          onSubmit={submitAdd}
        />
      )}
    </div>
  );
}
