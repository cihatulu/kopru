import { useState } from 'react';
import {
  OrgDialogs,
  OrgTable,
  OrgToolbar,
  ResetPasswordError,
  normalizeSubdomain,
  toSubscriberFilter,
  useCreateOrg,
  useDowngradeOrg,
  useOrgList,
  useResetOrgPassword,
  useSetOrgActive,
  useUpgradeOrg,
  type AdminOrg,
  type CreateOrgForm,
  type ResetPasswordResult,
  type SubscriberFilter,
  type UpgradeResult,
} from '@/features/admin';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { OrgKind } from '@/constants';

/** Üretici/perakendeci yönetimi — YALNIZ KOMPOZİSYON (A20). */
export function AdminOrgsPage({ kind }: { kind: OrgKind }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SubscriberFilter>('all');
  const [target, setTarget] = useState<AdminOrg | null>(null);
  const [result, setResult] = useState<UpgradeResult | null>(null);
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

  const orgs = list.data?.pages.flat() ?? [];

  const submitCreate = (v: CreateOrgForm) => {
    create.mutate(
      {
        kind,
        companyName: v.companyName,
        vknTc: v.vknTc,
        ...(v.authorizedName ? { authorizedName: v.authorizedName } : {}),
        ...(v.phone ? { phone: v.phone } : {}),
        ...(v.email ? { email: v.email } : {}),
      },
      {
        onSuccess: () => {
          setCreating(false);
          create.reset();
        },
      },
    );
  };

  const doReset = (org: AdminOrg) => {
    setBusyId(org.id);
    resetPassword.mutate(org.id, {
      onSuccess: (r) => setCredentials({ ...r, companyName: org.companyName }),
      onSettled: () => setBusyId(undefined),
    });
  };

  return (
    <div className="space-y-5">
      <OrgToolbar
        kind={kind}
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        total={orgs.length}
        onCreate={() => setCreating(true)}
      />

      {list.isError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Liste yüklenemedi.
        </p>
      )}

      {resetPassword.isError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {resetPassword.error instanceof ResetPasswordError
            ? resetPassword.error.message
            : 'Şifre yenilenemedi.'}
        </p>
      )}

      {list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <OrgTable
          orgs={orgs}
          busyId={busyId ?? (upgrade.isPending || downgrade.isPending ? target?.id : undefined)}
          onUpgrade={setTarget}
          onDowngrade={(org) => downgrade.mutate(org.id)}
          onToggleActive={(org) => setActive.mutate({ orgId: org.id, isActive: !org.isActive })}
          onResetPassword={doReset}
        />
      )}

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

      <OrgDialogs
        kind={kind}
        creating={creating}
        createPending={create.isPending}
        createFailed={create.isError}
        onCreateClose={() => {
          setCreating(false);
          create.reset();
        }}
        onCreateSubmit={submitCreate}
        upgradeTarget={target}
        upgradePending={upgrade.isPending}
        upgradeResult={result}
        onUpgradeClose={() => {
          setTarget(null);
          setResult(null);
          upgrade.reset();
        }}
        onUpgradeConfirm={(subdomain: string) =>
          target &&
          upgrade.mutate(
            { orgId: target.id, subdomain: normalizeSubdomain(subdomain) },
            { onSuccess: setResult },
          )
        }
        credentials={credentials}
        onCredentialsClose={() => {
          setCredentials(null);
          resetPassword.reset();
        }}
      />
    </div>
  );
}

export default AdminOrgsPage;
