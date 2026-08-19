import { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import type { OrgKind } from '@/constants';
import { useCounterparties } from '../api/useCounterparties';
import {
  useCreateCustomer,
  useResetCustomerPassword,
  useUpdateCustomer,
  CustomerError,
} from '../api/useCustomerMutations';
import {
  useSetCounterpartyDiscount,
  useSetCounterpartyStatus,
  useRespondToConnection,
  useDeleteCounterparty,
} from '../api/useCounterpartyMutations';
import { isIncomingRequest, isOutgoingRequest, otherParty, type Edge } from '../domain/counterparty';
import { CustomerHeader } from './CustomerHeader';
import { CustomerTable } from './CustomerTable';
import { CustomerDialog } from './CustomerDialog';
import { EditCustomerDialog } from './EditCustomerDialog';
import { ResetCustomerPasswordDialog } from './ResetCustomerPasswordDialog';
import { IncomingRequests } from './IncomingRequests';
import { OutgoingRequests } from './OutgoingRequests';
import { DeleteCounterpartyConfirm } from './DeleteCounterpartyConfirm';

type Dialog = 'none' | 'add' | 'edit' | 'password';

/** Müşteri Yönetimi — durum burada, sayfa yalnız kompozisyon (A19/A20). */
export function CustomerManager({
  myOrgId,
  myKind,
  myVknTc,
}: {
  myOrgId: string;
  myKind: OrgKind;
  myVknTc: string;
}) {
  const [showPassive, setShowPassive] = useState(false);
  const [dialog, setDialog] = useState<Dialog>('none');
  const [target, setTarget] = useState<Edge | null>(null);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);
  const [createResult, setCreateResult] = useState<any>(null);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const list = useCounterparties();
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const setDiscount = useSetCounterpartyDiscount();
  const setStatus = useSetCounterpartyStatus();
  const resetPassword = useResetCustomerPassword();
  const respond = useRespondToConnection();
  const del = useDeleteCounterparty();

  const all = list.data?.pages.flat() ?? [];
  const incoming = all.filter((e) => isIncomingRequest(e, myOrgId));
  const outgoing = all.filter((e) => isOutgoingRequest(e, myOrgId));
  // Bekleyen istekler üstteki bölümde ayrıca gösteriliyor; tabloda tekrar etmez.
  const settled = all.filter((e) => e.status !== 'pending');
  const passiveCount = settled.filter((e) => e.status !== 'active').length;
  const visible = settled.filter((e) => (showPassive ? e.status !== 'active' : e.status === 'active'));

  const close = () => {
    setDialog('none');
    setTarget(null);
    setResetDone(false);
    setCreateResult(null);
    setGeneratedPassword('');
    create.reset();
    update.reset();
    resetPassword.reset();
  };

  return (
    <div className="space-y-6">
      <CustomerHeader
        showPassive={showPassive}
        passiveCount={passiveCount}
        onTogglePassive={() => setShowPassive((v) => !v)}
        onAdd={() => setDialog('add')}
      />

      <IncomingRequests
        requests={incoming}
        myOrgId={myOrgId}
        busyId={respond.isPending ? busyId : undefined}
        onRespond={(relationshipId, accept) => {
          setBusyId(relationshipId);
          respond.mutate({ relationshipId, accept }, { onSettled: () => setBusyId(undefined) });
        }}
      />

      <OutgoingRequests requests={outgoing} myOrgId={myOrgId} />

      {list.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <CustomerTable
          edges={visible}
          myOrgId={myOrgId}
          busyId={busyId}
          onEdit={(e) => {
            setTarget(e);
            setDialog('edit');
          }}
          onResetPassword={(e) => {
            setTarget(e);
            setDialog('password');
          }}
          onToggleActive={(e) => {
            setBusyId(e.id);
            setStatus.mutate(
              { relationshipId: e.id, status: e.status === 'active' ? 'passive' : 'active' },
              { onSettled: () => setBusyId(undefined) },
            );
          }}
          onDelete={(e) => {
            setDeleteTargetId(e.id);
          }}
        />
      )}

      <p className="px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
        Toplam {visible.length} müşteri
      </p>

      {dialog === 'add' && (
        <CustomerDialog
          myKind={myKind}
          myVknTc={myVknTc}
          pending={create.isPending}
          errorMessage={create.error instanceof CustomerError ? create.error.message : undefined}
          result={createResult}
          generatedPassword={generatedPassword}
          onClose={close}
          onSubmit={(input) =>
            create.mutate(input, {
              onSuccess: (res) => {
                if (input.password) {
                  setCreateResult(res);
                  setGeneratedPassword(input.password);
                } else {
                  setCreateResult(res);
                }
              },
            })
          }
        />
      )}

      {dialog === 'edit' && target && (
        <EditCustomerDialog
          party={otherParty(target, myOrgId)}
          discountRate={target.discountRate}
          pending={update.isPending || setDiscount.isPending}
          errorMessage={update.isError ? 'Kaydedilemedi. Abone firmaların kartı düzenlenemez.' : undefined}
          onClose={close}
          onSubmit={(v) => {
            const orgId = otherParty(target, myOrgId).id;
            // İskonto İLİŞKİYE, diğer alanlar ORGa ait — iki ayrı yazma.
            setDiscount.mutate({ relationshipId: target.id, discountRate: v.discountRate });
            update.mutate(
              {
                orgId,
                companyName: v.companyName,
                authorizedName: v.authorizedName,
                email: v.email,
                phone: v.phone,
                address: v.address,
              },
              { onSuccess: close },
            );
          }}
        />
      )}

      {dialog === 'password' && target && (
        <ResetCustomerPasswordDialog
          companyName={otherParty(target, myOrgId).companyName}
          pending={resetPassword.isPending}
          done={resetDone}
          errorMessage={
            resetPassword.error instanceof CustomerError ? resetPassword.error.message : undefined
          }
          onClose={close}
          onSubmit={(newPassword) =>
            resetPassword.mutate(
              { orgId: otherParty(target, myOrgId).id, newPassword },
              { onSuccess: () => setResetDone(true) },
            )
          }
        />
      )}

      {deleteTargetId && (
        <DeleteCounterpartyConfirm
          noun="Firmayı"
          pending={del.isPending}
          errorMessage={del.error instanceof Error ? del.error.message : undefined}
          onCancel={() => setDeleteTargetId(null)}
          onConfirm={() =>
            del.mutate(deleteTargetId, { onSuccess: () => setDeleteTargetId(null) })
          }
        />
      )}
    </div>
  );
}
