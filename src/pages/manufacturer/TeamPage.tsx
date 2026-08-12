import { useState } from 'react';
import {
  StaffTable,
  StaffDialog,
  ResetPasswordForm,
  useStaff,
  useStaffScope,
  useCreateStaff,
  useUpdateStaff,
  useResetStaffPassword,
  useSetStaffActive,
  useSetStaffScope,
  type StaffMember,
} from '@/features/team';
import { otherParty, useCounterparties } from '@/features/counterparties';
import { useAuthSession } from '@/features/auth';
import { Spinner } from '@/components/ui/Spinner';

export default function TeamPage() {
  const { data: user } = useAuthSession();
  const list = useStaff();

  const create = useCreateStaff();
  const update = useUpdateStaff();
  const resetPassword = useResetStaffPassword();
  const setActive = useSetStaffActive();
  const setScope = useSetStaffScope();

  // Modals / States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [resettingPasswordStaff, setResettingPasswordStaff] = useState<StaffMember | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [createdStaffInfo, setCreatedStaffInfo] = useState<{ fullName: string; vkn: string; password?: string } | null>(null);

  // Lazy loading the scope for editing staff
  const scopeQuery = useStaffScope(editingStaff?.id ?? null);
  const initialScope = scopeQuery.data ?? [];

  // Active counterparties/retailers list
  const edges = (useCounterparties().data?.pages.flat() ?? []).filter((e) => e.status === 'active');

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

  // Personel Ekleme
  const handleAddStaffSubmit = (values: {
    fullName: string;
    userCode: string;
    email: string;
    phone: string;
    password?: string;
    assignedRetailerIds: string[];
  }) => {
    create.mutate(
      {
        fullName: values.fullName,
        userCode: values.userCode,
        email: values.email || undefined,
        phone: values.phone || undefined,
        password: values.password || '',
        role: 'staff',
      },
      {
        onSuccess: (result) => {
          // Bayi kapsamını ata
          setScope.mutate(
            {
              staffUserId: result.userId,
              retailerOrgIds: values.assignedRetailerIds,
            },
            {
              onSuccess: () => {
                setIsAddModalOpen(false);
                create.reset();
                setCreatedStaffInfo({
                  fullName: values.fullName,
                  vkn: user.org.vkn_tc,
                  password: values.password,
                });
              },
            },
          );
        },
      },
    );
  };

  // Personel Düzenleme
  const handleEditStaffSubmit = (values: {
    fullName: string;
    userCode: string;
    email: string;
    phone: string;
    assignedRetailerIds: string[];
  }) => {
    if (!editingStaff) return;

    update.mutate(
      {
        userId: editingStaff.id,
        fullName: values.fullName,
        userCode: values.userCode,
        email: values.email || undefined,
        phone: values.phone || undefined,
        role: editingStaff.role, // Rolünü koru
      },
      {
        onSuccess: () => {
          // Bayi kapsamını ata
          setScope.mutate(
            {
              staffUserId: editingStaff.id,
              retailerOrgIds: values.assignedRetailerIds,
            },
            {
              onSuccess: () => {
                setEditingStaff(null);
                update.reset();
              },
            },
          );
        },
      },
    );
  };

  // Şifre Sıfırlama
  const handleResetPassword = (newPassword: string) => {
    if (!resettingPasswordStaff) return;

    resetPassword.mutate(
      {
        userId: resettingPasswordStaff.id,
        newPassword,
      },
      {
        onSuccess: () => {
          setResettingPasswordStaff(null);
          resetPassword.reset();
        },
      },
    );
  };

  // Silme (Pasife Çekerek Gizleme)
  const handleDeleteConfirm = () => {
    if (!deleteConfirmId) return;

    setActive.mutate(
      {
        userId: deleteConfirmId,
        isActive: false,
      },
      {
        onSuccess: () => {
          setDeleteConfirmId(null);
        },
      },
    );
  };

  const isPending =
    create.isPending ||
    update.isPending ||
    resetPassword.isPending ||
    setActive.isPending ||
    setScope.isPending;

  // Sadece aktif (silinmemiş/pasifleşmemiş) personeller gösterilir
  const activeStaffMembers = (list.data ?? []).filter((m) => m.isActive);

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ekip (Personel) Yönetimi</h1>
          <p className="text-slate-400 text-xs">
            Satış temsilcilerinizi oluşturabilir, şifrelerini güncelleyebilir ve bayi portföylerini atayabilirsiniz.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="bg-slate-900 hover:bg-slate-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
          members={activeStaffMembers}
          myUserId={user.id}
          onEdit={setEditingStaff}
          onResetPassword={setResettingPasswordStaff}
          onDelete={(m) => setDeleteConfirmId(m.id)}
        />
      )}

      {/* Yeni Personel Ekle Modalı */}
      {isAddModalOpen && (
        <StaffDialog
          retailers={retailers}
          vkn={user.org.vkn_tc}
          pending={isPending}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddStaffSubmit}
        />
      )}

      {/* Personel Düzenle Modalı */}
      {editingStaff && (
        <StaffDialog
          staff={editingStaff}
          retailers={retailers}
          vkn={user.org.vkn_tc}
          initialScope={initialScope}
          pending={isPending || scopeQuery.isPending}
          onClose={() => setEditingStaff(null)}
          onSubmit={handleEditStaffSubmit}
        />
      )}

      {/* Personel Başarıyla Eklendi Bilgi Modalı */}
      {createdStaffInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200 text-left border border-slate-100/80">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-5 border border-emerald-100 text-lg">
              🎉
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Personel Başarıyla Eklendi</h3>
            <p className="text-slate-500 text-xs mb-6 font-medium leading-relaxed">
              <strong>{createdStaffInfo.fullName}</strong> isimli personeliniz için hesap başarıyla oluşturuldu. Personelinizin giriş yaparken kullanacağı kimlik bilgileri aşağıdadır:
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3.5 mb-6 shadow-inner">
              <div>
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Kullanıcı Kodu (VKN)</span>
                <strong className="text-sm font-mono text-slate-800">{createdStaffInfo.vkn}</strong>
              </div>
              <div>
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Şifre</span>
                <strong className="text-sm font-mono text-slate-800">{createdStaffInfo.password}</strong>
              </div>
              <div className="pt-2.5 border-t border-slate-200">
                <span className="block text-[10px] text-amber-700 font-extrabold italic">
                  ℹ️ Personeliniz giriş yaparken "Personel Girişi" seçeneğini işaretlemelidir.
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setCreatedStaffInfo(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 text-xs cursor-pointer shadow-md"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Şifre Sıfırla Modalı */}
      {resettingPasswordStaff && (
        <ResetPasswordForm
          staff={resettingPasswordStaff}
          pending={isPending}
          onClose={() => setResettingPasswordStaff(null)}
          onSave={handleResetPassword}
        />
      )}

      {/* Personel Silme Onay Penceresi */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-100">
              <svg className="w-6 h-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Personeli Sil</h3>
            <p className="text-slate-500 text-xs mb-8 leading-relaxed font-medium">
              Bu personeli silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-xs"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isPending}
                className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-200 text-xs"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
