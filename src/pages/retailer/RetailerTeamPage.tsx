import { useState } from 'react';
import { useAuthSession } from '@/features/auth';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import {
  useRetailerTeamMembers,
  useToggleRetailerMemberStatus,
  RetailerRoleBadge,
  AddRetailerMemberModal,
  EditRetailerMemberModal,
  type RetailerTeamMember,
} from '@/features/retailer-team';



export default function RetailerTeamPage() {
  const { data: user } = useAuthSession();
  const orgId = user?.org?.id ?? null;

  const { data: members, isLoading: membersLoading } = useRetailerTeamMembers(orgId);
  const toggle = useToggleRetailerMemberStatus();

  const [addOpen, setAddOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<RetailerTeamMember | null>(null);

  const isLoading = membersLoading;

  const TH = 'px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-50';
  const TD = 'px-5 py-3.5 text-sm';

  return (
    <div className="space-y-6">
      {/* Sayfa Başlığı */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Ekip Yönetimi</h1>
          <p className="mt-1 text-sm text-slate-500">Üyeler ve davet yönetimi</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            Personel Ekle
          </Button>
        </div>
      </div>

      {/* İçerik */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          {!members || members.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
              <p className="text-sm font-medium text-slate-500">Henüz ekip üyesi yok.</p>
              <p className="mt-1 text-xs text-slate-400">Üye ekle veya davet et ile başlayın.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <table className="w-full min-w-[600px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className={TH}>E-posta</th>
                    <th className={TH}>Rol</th>
                    <th className={TH}>Durum</th>
                    <th className={`${TH} text-right pr-6`}>İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className={`${TD} font-medium text-slate-900`}>{m.email ?? '—'}</td>
                      <td className={TD}>
                        <RetailerRoleBadge role={m.role} />
                      </td>
                      <td className={TD}>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          m.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {m.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className={`${TD} text-right pr-6`}>
                        <div className="flex justify-end gap-3 items-center">
                          <button
                            type="button"
                            onClick={() => setEditingMember(m)}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            Düzenle
                          </button>
                          {m.isActive ? (
                            <button
                              type="button"
                              disabled={toggle.isPending}
                              onClick={() => toggle.mutate({ id: m.id, orgId: m.orgId, isActive: false })}
                              className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50"
                              title="Sil"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={toggle.isPending}
                              onClick={() => toggle.mutate({ id: m.id, orgId: m.orgId, isActive: true })}
                              className="text-xs font-semibold text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Geri Al
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modaller */}
      {addOpen && orgId && (
        <AddRetailerMemberModal orgId={orgId} onClose={() => setAddOpen(false)} />
      )}
      {editingMember && (
        <EditRetailerMemberModal member={editingMember} onClose={() => setEditingMember(null)} />
      )}
    </div>
  );
}
