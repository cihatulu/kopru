import { useState } from 'react';
import {
  StaffTable,
  StaffDialog,
  ResetPasswordForm,
  StaffCreatedDialog,
  DeleteStaffConfirm,
  useStaff,
  useStaffScope,
  useStaffActions,
  type StaffMember,
} from '@/features/team';
import { otherParty, useCounterparties } from '@/features/counterparties';
import { useAuthSession } from '@/features/auth';
import { Spinner } from '@/components/ui/Spinner';

export default function TeamPage() {
  const { data: user } = useAuthSession();
  const list = useStaff();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [resettingPasswordStaff, setResettingPasswordStaff] = useState<StaffMember | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const scopeQuery = useStaffScope(editingStaff?.id ?? null);
  const edges = (useCounterparties().data?.pages.flat() ?? []).filter((e) => e.status === 'active');

  const myVkn = user?.org?.vknTc ?? '';
  const actions = useStaffActions(myVkn);

  if (!user?.org) return null;
  const myOrgId = user.org.id;

  const retailers = [
    ...new Map(
      edges.map((e) => {
        const p = otherParty(e, myOrgId);
        return [p.id, { id: p.id, name: p.companyName }] as [string, { id: string; name: string }];
      }),
    ).values(),
  ];

  const pending = actions.isPending;

  return (
    <div className="space-y-6 font-sans text-slate-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Ekip (Personel) Yönetimi
          </h1>
          <p className="text-slate-400 text-xs">
            Satış temsilcilerinizi oluşturabilir, şifrelerini güncelleyebilir ve bayi portföylerini
            atayabilirsiniz.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="bg-slate-900 hover:bg-slate-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Yeni Personel Ekle
        </button>
      </div>

      {list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <StaffTable
          members={(list.data ?? []).filter((m) => m.isActive)}
          myUserId={user.id}
          onEdit={setEditingStaff}
          onResetPassword={setResettingPasswordStaff}
          onDelete={(m) => setDeleteConfirmId(m.id)}
        />
      )}

      {isAddModalOpen && (
        <StaffDialog
          retailers={retailers}
          vkn={myVkn}
          pending={pending}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={(values) => actions.addStaff(values, () => setIsAddModalOpen(false))}
        />
      )}

      {editingStaff && (
        <StaffDialog
          staff={editingStaff}
          retailers={retailers}
          vkn={myVkn}
          initialScope={scopeQuery.data ?? []}
          pending={pending || scopeQuery.isPending}
          onClose={() => setEditingStaff(null)}
          onSubmit={(values) =>
            actions.editStaff(editingStaff, values, () => setEditingStaff(null))
          }
        />
      )}

      {actions.createdStaffInfo && (
        <StaffCreatedDialog
          fullName={actions.createdStaffInfo.fullName}
          vkn={actions.createdStaffInfo.vkn}
          password={actions.createdStaffInfo.password}
          onClose={actions.clearCreatedStaffInfo}
        />
      )}

      {resettingPasswordStaff && (
        <ResetPasswordForm
          staff={resettingPasswordStaff}
          pending={pending}
          onClose={() => setResettingPasswordStaff(null)}
          onSave={(newPassword) =>
            actions.changePassword(resettingPasswordStaff.id, newPassword, () =>
              setResettingPasswordStaff(null),
            )
          }
        />
      )}

      {deleteConfirmId && (
        <DeleteStaffConfirm
          pending={pending}
          onCancel={() => setDeleteConfirmId(null)}
          onConfirm={() => actions.deactivate(deleteConfirmId, () => setDeleteConfirmId(null))}
        />
      )}
    </div>
  );
}
