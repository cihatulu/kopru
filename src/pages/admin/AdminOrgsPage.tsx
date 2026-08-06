import { useState } from 'react';
import {
  CreateOrgDialog,
  OrgTable,
  OrgToolbar,
  UpgradeDialog,
  normalizeSubdomain,
  toSubscriberFilter,
  useCreateOrg,
  useDowngradeOrg,
  useOrgList,
  useSetOrgActive,
  useUpgradeOrg,
  type AdminOrg,
  type CreateOrgForm,
  type SubscriberFilter,
  type UpgradeResult,
} from '@/features/admin';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { OrgKind, Plan } from '@/constants';

/** Üretici/perakendeci yönetimi — YALNIZ KOMPOZİSYON (A20). */
export function AdminOrgsPage({ kind }: { kind: OrgKind }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SubscriberFilter>('all');
  const [target, setTarget] = useState<AdminOrg | null>(null);
  const [result, setResult] = useState<UpgradeResult | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useOrgList({ kind, search, ...toSubscriberFilter(filter) });
  const create = useCreateOrg();
  const upgrade = useUpgradeOrg();
  const downgrade = useDowngradeOrg();
  const setActive = useSetOrgActive();

  const orgs = list.data?.pages.flat() ?? [];
  const busy = upgrade.isPending || downgrade.isPending ? (target?.id ?? undefined) : undefined;

  const closeUpgrade = () => {
    setTarget(null);
    setResult(null);
    upgrade.reset();
  };

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

      {list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <OrgTable
          orgs={orgs}
          busyId={busy}
          onUpgrade={setTarget}
          onDowngrade={(org) => downgrade.mutate(org.id)}
          onToggleActive={(org) => setActive.mutate({ orgId: org.id, isActive: !org.isActive })}
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

      {creating && (
        <CreateOrgDialog
          kind={kind}
          pending={create.isPending}
          errorMessage={
            create.isError ? 'Oluşturulamadı. Bu VKN zaten kayıtlı olabilir.' : undefined
          }
          onClose={() => {
            setCreating(false);
            create.reset();
          }}
          onSubmit={submitCreate}
        />
      )}

      {target && (
        <UpgradeDialog
          org={target}
          pending={upgrade.isPending}
          result={result}
          onClose={closeUpgrade}
          onConfirm={(plan: Plan, subdomain: string) =>
            upgrade.mutate(
              { orgId: target.id, plan, subdomain: normalizeSubdomain(subdomain) },
              { onSuccess: setResult },
            )
          }
        />
      )}
    </div>
  );
}

export default AdminOrgsPage;
