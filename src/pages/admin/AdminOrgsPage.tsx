import { useState } from 'react';
import {
  OrgTable,
  OrgToolbar,
  UpgradeDialog,
  normalizeSubdomain,
  toSubscriberFilter,
  useDowngradeOrg,
  useOrgList,
  useSetOrgActive,
  useUpgradeOrg,
  type AdminOrg,
  type SubscriberFilter,
  type UpgradeResult,
} from '@/features/admin';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ORG_KIND, type OrgKind } from '@/constants';

const TITLES: Record<OrgKind, string> = {
  [ORG_KIND.manufacturer]: 'Üretici Yönet',
  [ORG_KIND.retailer]: 'Perakendeci Yönet',
};

/** Üretici/perakendeci yönetimi — YALNIZ KOMPOZİSYON (A20). */
export function AdminOrgsPage({ kind }: { kind: OrgKind }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SubscriberFilter>('all');
  const [target, setTarget] = useState<AdminOrg | null>(null);
  const [result, setResult] = useState<UpgradeResult | null>(null);

  const list = useOrgList({ kind, search, ...toSubscriberFilter(filter) });
  const upgrade = useUpgradeOrg();
  const downgrade = useDowngradeOrg();
  const setActive = useSetOrgActive();

  const orgs = list.data?.pages.flat() ?? [];

  const closeDialog = () => {
    setTarget(null);
    setResult(null);
    upgrade.reset();
  };

  const confirmUpgrade = (plan: Parameters<typeof upgrade.mutate>[0]['plan'], subdomain: string) => {
    if (!target) return;
    upgrade.mutate(
      { orgId: target.id, plan, subdomain: normalizeSubdomain(subdomain) },
      { onSuccess: (r) => setResult(r) },
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{TITLES[kind]}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Abone ve misafir organizasyonlar aynı listede. Misafir bir kayıt tek tıkla aboneye
          yükseltilir; mevcut ticari ilişkileri korunur.
        </p>
      </div>

      <OrgToolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        total={orgs.length}
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
          busyId={upgrade.isPending || downgrade.isPending ? (target?.id ?? undefined) : undefined}
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

      {target && (
        <UpgradeDialog
          org={target}
          pending={upgrade.isPending}
          result={result}
          onClose={closeDialog}
          onConfirm={confirmUpgrade}
        />
      )}
    </div>
  );
}

export default AdminOrgsPage;
