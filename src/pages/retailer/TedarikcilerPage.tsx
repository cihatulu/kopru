import { useState } from 'react';
import { useAuthSession } from '@/features/auth';
import {
  useCounterpartyActions,
  useSupplierInvites,
  IncomingRequests,
  OutgoingRequests,
  SupplierHeader,
  SupplierTabs,
  SupplierTable,
  SupplierInvitations,
  InviteSupplierModal,
  InviteSentDialog,
  CustomerDialog,
  EditCustomerDialog,
  ResetCustomerPasswordDialog,
  DeleteCounterpartyConfirm,
  type SupplierTab,
} from '@/features/counterparties';

/** Üretici Yönetimi — yalnız kompozisyon (A20). */
export default function TedarikcilerPage() {
  const { data: user } = useAuthSession();
  const [tab, setTab] = useState<SupplierTab>('active');
  const org = user?.org;
  const a = useCounterpartyActions(org?.id ?? '');
  const invites = useSupplierInvites();

  if (!org) return null;

  const visible = tab === 'active' ? a.active : a.passive;

  return (
    <div className="space-y-6 font-sans">
      <IncomingRequests
        requests={a.incoming}
        myOrgId={org.id}
        onRespond={(relationshipId, accept) => a.respond.mutate({ relationshipId, accept })}
      />
      <OutgoingRequests requests={a.outgoing} myOrgId={org.id} />

      <SupplierHeader onInvite={a.openInvite} onAdd={a.openAdd} />

      <SupplierTabs
        value={tab}
        activeCount={a.active.length}
        passiveCount={a.passive.length}
        onChange={setTab}
      />

      <SupplierTable
        edges={visible}
        myOrgId={org.id}
        loading={a.list.isPending}
        catalogPending={a.toggleCatalog.isPending}
        onToggleCatalog={a.toggleCatalogFor}
        onToggleStatus={a.toggleStatus}
        onEdit={a.openEdit}
        onResetPassword={a.openPassword}
        onDelete={a.askDelete}
      />

      <SupplierInvitations
        invitations={invites.invitations}
        loading={invites.loading}
        revoking={invites.revoke.isPending}
        onRevoke={(invitationId) => invites.revoke.mutate(invitationId)}
      />

      {a.dialog === 'add' && (
        <CustomerDialog
          myKind={org.kind}
          myVknTc={org.vknTc ?? ''}
          pending={a.createCustomer.isPending}
          errorMessage={
            a.createCustomer.error instanceof Error ? a.createCustomer.error.message : undefined
          }
          onClose={a.close}
          onSubmit={(input) => a.createCustomer.mutate(input, { onSuccess: a.close })}
        />
      )}

      {a.dialog === 'invite' && (
        <InviteSupplierModal
          pending={invites.create.isPending}
          errorMessage={
            invites.create.error instanceof Error ? invites.create.error.message : undefined
          }
          onClose={a.close}
          onSubmit={(values) => invites.send(values, a.close)}
        />
      )}

      {invites.sent && <InviteSentDialog sent={invites.sent} onClose={invites.clearSent} />}

      {a.dialog === 'edit' && a.target && (
        <EditCustomerDialog
          party={a.target.party}
          discountRate={a.target.edge.discountRate}
          discountEditable={false}
          title="Üreticiyi Düzenle"
          pending={a.updateCustomer.isPending}
          errorMessage={
            a.updateCustomer.isError
              ? 'Kaydedilemedi. Abone firmaların kartı düzenlenemez.'
              : undefined
          }
          onClose={a.close}
          onSubmit={a.saveEdit}
        />
      )}

      {a.dialog === 'password' && a.target && (
        <ResetCustomerPasswordDialog
          companyName={a.target.party.companyName}
          pending={a.resetPassword.isPending}
          done={a.resetDone}
          errorMessage={
            a.resetPassword.error instanceof Error ? a.resetPassword.error.message : undefined
          }
          onClose={a.close}
          onSubmit={a.savePassword}
        />
      )}

      {a.deleteTargetId && (
        <DeleteCounterpartyConfirm
          noun="Üreticiyi"
          pending={a.del.isPending}
          errorMessage={a.del.error instanceof Error ? a.del.error.message : undefined}
          onCancel={a.cancelDelete}
          onConfirm={a.confirmDelete}
        />
      )}
    </div>
  );
}
