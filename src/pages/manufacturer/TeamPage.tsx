import { useState } from 'react';
import {
  ScopeDialog,
  StaffDialog,
  StaffError,
  StaffTable,
  useCreateStaff,
  useSetStaffActive,
  useSetStaffRole,
  useSetStaffScope,
  useStaff,
  type CreateStaffForm,
  type CreateStaffResult,
  type StaffMember,
} from '@/features/team';
import { otherParty, useCounterparties } from '@/features/counterparties';
import { useAuthSession } from '@/features/auth';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

/** Ekip Yönetimi — YALNIZ KOMPOZİSYON (A20). */
export default function TeamPage() {
  const { data: user } = useAuthSession();
  const list = useStaff();
  const create = useCreateStaff();
  const setRole = useSetStaffRole();
  const setActive = useSetStaffActive();
  const setScope = useSetStaffScope();

  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState<CreateStaffResult | null>(null);
  const [scopeTarget, setScopeTarget] = useState<StaffMember | null>(null);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  const edges = (useCounterparties().data?.pages.flat() ?? []).filter(
    (e) => e.status === 'active',
  );

  if (!user?.org) return null;
  const myOrgId = user.org.id;

  const customers: [string, string][] = [
    ...new Map(
      edges.map((e) => {
        const p = otherParty(e, myOrgId);
        return [p.id, p.companyName] as [string, string];
      }),
    ),
  ];

  const submit = (v: CreateStaffForm) => {
    create.mutate(
      {
        fullName: String(v.fullName),
        role: v.role ?? 'staff',
        password: String(v.password),
        ...(v.email ? { email: String(v.email) } : {}),
        ...(v.phone ? { phone: String(v.phone) } : {}),
      },
      { onSuccess: setCreated },
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Ekip Yönetimi</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Personel yalnız kendisine atanan müşterileri görür. Muhasebeci cari hesap
            işlemlerini yürütür.
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>Personel ekle</Button>
      </div>

      {(setRole.isError || setActive.isError) && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          İşlem tamamlanamadı. Kendi rolünüzü veya durumunuzu değiştiremezsiniz.
        </p>
      )}

      {list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <StaffTable
          members={list.data ?? []}
          myUserId={user.id}
          busyId={busyId}
          onScope={setScopeTarget}
          onChangeRole={(m, role) => setRole.mutate({ userId: m.id, role })}
          onToggleActive={(m) => {
            setBusyId(m.id);
            setActive.mutate(
              { userId: m.id, isActive: !m.isActive },
              { onSettled: () => setBusyId(undefined) },
            );
          }}
        />
      )}

      {adding && (
        <StaffDialog
          pending={create.isPending}
          result={created}
          errorMessage={create.error instanceof StaffError ? create.error.message : undefined}
          onClose={() => {
            setAdding(false);
            setCreated(null);
            create.reset();
          }}
          onSubmit={submit}
        />
      )}

      {scopeTarget && (
        <ScopeDialog
          member={scopeTarget}
          customers={customers}
          pending={setScope.isPending}
          onClose={() => setScopeTarget(null)}
          onSave={(ids) =>
            setScope.mutate(
              { staffUserId: scopeTarget.id, retailerOrgIds: ids },
              { onSuccess: () => setScopeTarget(null) },
            )
          }
        />
      )}
    </div>
  );
}
