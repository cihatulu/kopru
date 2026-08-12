import { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
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

      {/* Giden Bağlantı İstekleri */}
      {outgoing.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <h3 className="text-sm font-bold text-blue-800">Bekleyen Giden İstekler</h3>
          </div>
          <div className="divide-y divide-blue-100">
            {outgoing.map((req) => {
              const party = otherParty(req, myOrgId);
              return (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 first:pt-0 last:pb-0 gap-3">
                  <div>
                    <span className="font-semibold text-slate-800 text-sm">{party.companyName}</span>
                    <span className="text-xs text-slate-500 font-mono ml-2">({party.vknTc})</span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Karşı taraf da abone olduğu için onayı bekleniyor.
                    </p>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Onay Bekliyor
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          onClose={close}
          onSubmit={(input) => create.mutate(input, { onSuccess: close })}
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
        <Modal
          label="Firmayı Sil"
          panelClassName="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          onClose={() => setDeleteTargetId(null)}
          closeDisabled={del.isPending}
        >
          <h2 className="text-lg font-extrabold text-slate-800">Firmayı Sil</h2>
          <p className="mt-2 text-sm text-slate-600">
            Bu firmayı tamamen silmek istediğinize emin misiniz?
          </p>
          {del.isError && (
            <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {del.error instanceof Error ? del.error.message : 'Silinemedi'}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setDeleteTargetId(null)}
              disabled={del.isPending}
            >
              İptal
            </Button>
            <Button
              variant="primary"
              className="!bg-red-600 hover:!bg-red-700"
              loading={del.isPending}
              onClick={() => {
                del.mutate(deleteTargetId, {
                  onSuccess: () => setDeleteTargetId(null),
                });
              }}
            >
              Sil
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
