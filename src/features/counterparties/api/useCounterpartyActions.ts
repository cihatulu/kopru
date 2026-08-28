import { useState } from 'react';
import { useCounterparties } from './useCounterparties';
import { useCreateCustomer, useUpdateCustomer, useResetCustomerPassword } from './useCustomerMutations';
import {
  useSetCounterpartyStatus,
  useRespondToConnection,
  useDeleteCounterparty,
} from './useCounterpartyMutations';
import { useToggleCatalogPermission } from './useCatalogPermission';
import { isIncomingRequest, isOutgoingRequest, type Edge, type Party } from '../domain/counterparty';

export type SupplierDialog = 'none' | 'add' | 'invite' | 'edit' | 'password' | 'guestCredentials';

interface EditValues {
  companyName: string;
  authorizedName: string;
  email: string;
  phone: string;
  address: string;
}

/**
 * Üretici Yönetimi ekranının durumu ve eylemleri.
 *
 * Sayfa yalnız kompozisyondur (A19/A20); diyalog durumu ve mutation'lar
 * oraya yazılmaz. Davetler ayrı hook'ta: `useCounterpartyInvites`.
 */
export function useCounterpartyActions(myOrgId: string) {
  const [dialog, setDialog] = useState<SupplierDialog>('none');
  const [target, setTarget] = useState<{ edge: Edge; party: Party } | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);

  const list = useCounterparties();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const resetPassword = useResetCustomerPassword();
  const respond = useRespondToConnection();
  const setStatus = useSetCounterpartyStatus();
  const toggleCatalog = useToggleCatalogPermission();
  const del = useDeleteCounterparty();

  const rawEdges = list.data?.pages.flat() ?? [];
  const edges = rawEdges.filter((e) => e.retailer.id === myOrgId || e.manufacturerOrgId === myOrgId);
  const incoming = edges.filter((e) => isIncomingRequest(e, myOrgId));
  const outgoing = edges.filter((e) => isOutgoingRequest(e, myOrgId));
  const active = edges.filter((e) => e.status === 'active');
  const passive = edges.filter((e) => e.status === 'passive');

  const close = () => {
    setDialog('none');
    setTarget(null);
    setResetDone(false);
    createCustomer.reset();
    updateCustomer.reset();
    resetPassword.reset();
  };

  return {
    list,
    incoming,
    outgoing,
    active,
    passive,

    dialog,
    target,
    deleteTargetId,
    resetDone,
    close,
    openAdd: () => setDialog('add'),
    openInvite: () => setDialog('invite'),
    openEdit: (edge: Edge, party: Party) => {
      setTarget({ edge, party });
      setDialog('edit');
    },
    openPassword: (edge: Edge, party: Party) => {
      setTarget({ edge, party });
      setDialog('password');
    },
    openGuestCredentials: (edge: Edge, party: Party) => {
      setTarget({ edge, party });
      setDialog('guestCredentials');
    },
    askDelete: setDeleteTargetId,
    cancelDelete: () => setDeleteTargetId(null),

    respond,
    setStatus,
    toggleCatalog,
    del,
    createCustomer,
    updateCustomer,
    resetPassword,

    toggleStatus: (relationshipId: string, current: string) =>
      setStatus.mutate({
        relationshipId,
        status: current === 'active' ? 'passive' : 'active',
      }),

    toggleCatalogFor: (relationshipId: string, current: boolean) =>
      toggleCatalog.mutate({ relationshipId, nextVal: !current }),

    confirmDelete: () => {
      if (deleteTargetId) del.mutate(deleteTargetId, { onSuccess: () => setDeleteTargetId(null) });
    },

    saveEdit: (v: EditValues) => {
      if (!target) return;
      // İskonto GÖNDERİLMEZ: A5, iskontoyu karşı taraf (üretici) belirler.
      updateCustomer.mutate({ orgId: target.party.id, ...v }, { onSuccess: close });
    },

    savePassword: (newPassword: string) => {
      if (!target) return;
      resetPassword.mutate(
        { orgId: target.party.id, newPassword },
        { onSuccess: () => setResetDone(true) },
      );
    },
  };
}
