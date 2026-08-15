import {
  DeleteOrgDialog,
  OrgDialogs,
  OrgTable,
  OrgToolbar,
  ResetPasswordError,
  useAdminOrgs,
} from '@/features/admin';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ListFooter } from '@/components/ui/ListFooter';
import { Spinner } from '@/components/ui/Spinner';
import type { OrgKind } from '@/constants';

/** Üretici/perakendeci yönetimi — YALNIZ KOMPOZİSYON (A20). */
export function AdminOrgsPage({ kind }: { kind: OrgKind }) {
  const a = useAdminOrgs(kind);

  return (
    <div className="space-y-5">
      <OrgToolbar
        kind={kind}
        search={a.search}
        onSearchChange={a.setSearch}
        filter={a.filter}
        onFilterChange={a.setFilter}
        total={a.orgs.length}
        onCreate={() => a.setCreating(true)}
      />

      {a.list.isError && <ErrorAlert>Liste yüklenemedi.</ErrorAlert>}

      {a.resetPassword.isError && (
        <ErrorAlert>
          {a.resetPassword.error instanceof ResetPasswordError
            ? a.resetPassword.error.message
            : 'Şifre yenilenemedi.'}
        </ErrorAlert>
      )}

      {a.deleteOrg.isError && <ErrorAlert>Firma silinirken bir hata oluştu.</ErrorAlert>}

      {a.list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <OrgTable
          orgs={a.orgs}
          busyId={a.busyId}
          onUpgrade={a.setUpgradeTarget}
          onDowngrade={a.downgradeOrg}
          onToggleActive={a.toggleActive}
          onResetPassword={a.resetOrgPassword}
          onDelete={a.setDeletingOrg}
        />
      )}

      <ListFooter
        label={`Toplam ${a.orgs.length} kayıt`}
        hasMore={a.list.hasNextPage}
        loading={a.list.isFetchingNextPage}
        onLoadMore={() => void a.list.fetchNextPage()}
      />

      {a.deletingOrg && (
        <DeleteOrgDialog
          org={a.deletingOrg}
          pending={a.deleteOrg.isPending}
          onClose={() => a.setDeletingOrg(null)}
          onConfirm={() => a.deletingOrg && a.confirmDelete(a.deletingOrg)}
        />
      )}

      <OrgDialogs
        kind={kind}
        creating={a.creating}
        createPending={a.create.isPending}
        createFailed={a.create.isError}
        onCreateClose={a.closeCreate}
        onCreateSubmit={a.submitCreate}
        upgradeTarget={a.upgradeTarget}
        upgradePending={a.upgrade.isPending}
        upgradeResult={a.upgradeResult}
        onUpgradeClose={a.closeUpgrade}
        onUpgradeConfirm={a.confirmUpgrade}
        credentials={a.credentials}
        onCredentialsClose={a.closeCredentials}
      />
    </div>
  );
}

export default AdminOrgsPage;
