import { useState } from 'react';
import type { OrgKind } from '@/constants';
import { toSubscriberFilter, type SubscriberFilter } from '../domain/filters';
import { toCreateOrgInput, type CreateOrgForm } from '../domain/orgSchema';
import { normalizeSubdomain } from '../domain/subdomain';
import { useOrgList, type AdminOrg } from './useOrgList';
import { useCreateOrg } from './useCreateOrg';
import {
  useDeleteOrg,
  useDowngradeOrg,
  useSetOrgActive,
  useUpgradeOrg,
  type UpgradeResult,
} from './useOrgMutations';
import { useResetOrgPassword, type ResetPasswordResult } from './useResetPassword';

/**
 * Admin org yönetiminin tüm durumu ve eylemleri.
 *
 * Sayfa yalnız kompozisyon olmak zorunda (A20); liste sorgusu, altı mutation ve
 * aralarındaki "hangi satır meşgul" eşlemesi burada durur. Böylece üretici ve
 * perakendeci sayfaları aynı davranışı iki kez tarif etmez.
 */
export function useAdminOrgs(kind: OrgKind) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SubscriberFilter>('all');
  const [upgradeTarget, setUpgradeTarget] = useState<AdminOrg | null>(null);
  const [deletingOrg, setDeletingOrg] = useState<AdminOrg | null>(null);
  const [upgradeResult, setUpgradeResult] = useState<UpgradeResult | null>(null);
  const [creating, setCreating] = useState(false);
  const [credentials, setCredentials] = useState<
    (ResetPasswordResult & { companyName: string }) | null
  >(null);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  const list = useOrgList({ kind, search, ...toSubscriberFilter(filter) });
  const create = useCreateOrg();
  const upgrade = useUpgradeOrg();
  const downgrade = useDowngradeOrg();
  const setActive = useSetOrgActive();
  const resetPassword = useResetOrgPassword();
  const deleteOrg = useDeleteOrg();

  const orgs = list.data?.pages.flat() ?? [];

  return {
    list,
    orgs,
    search,
    setSearch,
    filter,
    setFilter,
    creating,
    setCreating,
    upgradeTarget,
    setUpgradeTarget,
    upgradeResult,
    deletingOrg,
    setDeletingOrg,
    credentials,
    create,
    upgrade,
    downgrade,
    deleteOrg,
    resetPassword,

    /** Yükseltme/indirme sırasında da doğru satır kilitlenir. */
    busyId:
      busyId ?? (upgrade.isPending || downgrade.isPending ? upgradeTarget?.id : undefined),

    submitCreate: (v: CreateOrgForm) =>
      create.mutate(toCreateOrgInput(kind, v), {
        onSuccess: () => {
          setCreating(false);
          create.reset();
        },
      }),

    toggleActive: (org: AdminOrg) =>
      setActive.mutate({ orgId: org.id, isActive: !org.isActive }),

    downgradeOrg: (org: AdminOrg) => downgrade.mutate(org.id),

    confirmUpgrade: (subdomain: string) => {
      if (!upgradeTarget) return;
      upgrade.mutate(
        { orgId: upgradeTarget.id, subdomain: normalizeSubdomain(subdomain) },
        { onSuccess: setUpgradeResult },
      );
    },

    resetOrgPassword: (org: AdminOrg) => {
      setBusyId(org.id);
      resetPassword.mutate(org.id, {
        onSuccess: (r) => setCredentials({ ...r, companyName: org.companyName }),
        onSettled: () => setBusyId(undefined),
      });
    },

    confirmDelete: (org: AdminOrg) => {
      setBusyId(org.id);
      deleteOrg.mutate(org.id, {
        onSuccess: () => setDeletingOrg(null),
        onSettled: () => setBusyId(undefined),
      });
    },

    closeCreate: () => {
      setCreating(false);
      create.reset();
    },

    closeUpgrade: () => {
      setUpgradeTarget(null);
      setUpgradeResult(null);
      upgrade.reset();
    },

    closeCredentials: () => {
      setCredentials(null);
      resetPassword.reset();
    },
  };
}
