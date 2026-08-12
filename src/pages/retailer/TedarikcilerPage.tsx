import { useState } from 'react';
import { useAuthSession } from '@/features/auth';
import {
  useCounterparties,
  useSetCounterpartyStatus,
  useRespondToConnection,
  useToggleCatalogPermission,
  useUpdateCustomer,
  useResetCustomerPassword,
  useDeleteCounterparty,
  useCreateCustomer,
  CustomerDialog,
} from '@/features/counterparties';
import {
  useInvitations,
  useCreateInvitation,
  useRevokeInvitation,
  inviteUrl,
  inviteState,
} from '@/features/invitations';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { otherParty, isIncomingRequest, isOutgoingRequest, type Edge, type Party } from '@/features/counterparties/domain/counterparty';

export default function TedarikcilerPage() {
  const { data: user } = useAuthSession();
  const list = useCounterparties();
  const createCustomer = useCreateCustomer();
  const respond = useRespondToConnection();
  const setStatus = useSetCounterpartyStatus();
  const toggleCatalog = useToggleCatalogPermission();
  const del = useDeleteCounterparty();
  const updateCustomer = useUpdateCustomer();
  const resetPassword = useResetCustomerPassword();

  const { data: invitationsPage, isLoading: loadingInv } = useInvitations();
  const createInvite = useCreateInvitation();
  const revokeInvite = useRevokeInvitation();

  const [activeTab, setActiveTab] = useState<'active' | 'passive'>('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingParty, setEditingParty] = useState<{ edgeId: string; party: Party; discountRate: number } | null>(null);
  const [resettingParty, setResettingParty] = useState<Party | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // States for Invite Manufacturer
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteVkn, setInviteVkn] = useState('');
  const [inviteDiscount, setInviteDiscount] = useState('0');
  const [inviteError, setInviteError] = useState<string | null>(null);

  // States for Edit Manufacturer
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAuthName, setEditAuthName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // States for Reset Password
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const org = user?.org;
  if (!org) return null;

  const edges = list.data?.pages.flat() ?? [];
  const incoming = edges.filter((e) => isIncomingRequest(e, org.id));
  const outgoing = edges.filter((e) => isOutgoingRequest(e, org.id));
  const activeManufacturers = edges.filter((e) => e.status === 'active');
  const passiveManufacturers = edges.filter((e) => e.status === 'passive' || e.status === 'suspended');

  const filteredEdges = activeTab === 'active' ? activeManufacturers : passiveManufacturers;

  const invitations = invitationsPage?.pages.flat() ?? [];

  const handleToggleStatus = (relationshipId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'passive' : 'active';
    setStatus.mutate({ relationshipId, status: nextStatus });
  };

  const handleDelete = (relationshipId: string) => {
    setDeleteTargetId(relationshipId);
  };

  const handleToggleCatalog = (relationshipId: string, currentVal: boolean) => {
    toggleCatalog.mutate({ relationshipId, nextVal: !currentVal });
  };

  // (Kaldırıldı: handleAddSubmit artık CustomerDialog tarafından yönetiliyor)

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    if (!invitePhone.trim() && !inviteEmail.trim()) {
      setInviteError('Telefon numarası veya e-posta adresinden en az biri girilmelidir.');
      return;
    }

    createInvite.mutate(
      {
        companyName: inviteName.trim() || undefined,
        email: inviteEmail.trim() || undefined,
        phone: invitePhone.trim() || undefined,
        vknTc: inviteVkn.trim() || undefined,
        discountRate: Number(inviteDiscount),
        validDays: 14,
      },
      {
        onSuccess: () => {
          setShowInviteModal(false);
          setInvitePhone('');
          setInviteEmail('');
          setInviteName('');
          setInviteVkn('');
          setInviteDiscount('0');
        },
        onError: (err) => {
          setInviteError(err instanceof Error ? err.message : 'Davet oluşturulurken hata oluştu.');
        },
      }
    );
  };

  const handleEditOpen = (edge: Edge, party: Party) => {
    setEditingParty({ edgeId: edge.id, party, discountRate: edge.discountRate });
    setEditName(party.companyName || '');
    setEditEmail(party.email || '');
    setEditPhone(party.phone || '');
    setEditAuthName(party.authorizedName || '');
    setEditAddress(party.address || '');
    setEditError(null);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    if (!editingParty) return;

    updateCustomer.mutate(
      {
        orgId: editingParty.party.id,
        companyName: editName.trim() || undefined,
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
        authorizedName: editAuthName.trim() || undefined,
        address: editAddress.trim() || undefined,
      },
      {
        onSuccess: () => {
          setEditingParty(null);
        },
        onError: (err) => {
          setEditError(err instanceof Error ? err.message : 'Üretici bilgileri güncellenemedi.');
        },
      }
    );
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);
    if (!resettingParty) return;

    if (newPassword.length < 6) {
      setResetError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    resetPassword.mutate(
      {
        orgId: resettingParty.id,
        newPassword: newPassword,
      },
      {
        onSuccess: () => {
          setResetSuccess('Şifre başarıyla güncellendi.');
          setNewPassword('');
          setTimeout(() => {
            setResettingParty(null);
            setResetSuccess(null);
          }, 1500);
        },
        onError: (err) => {
          setResetError(err instanceof Error ? err.message : 'Şifre sıfırlanırken hata oluştu.');
        },
      }
    );
  };

  const handleCopyLink = (token: string, id: string) => {
    const url = inviteUrl(token, window.location.origin);
    void navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const TH = 'px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-50';
  const TD = 'px-5 py-4 text-sm whitespace-nowrap align-middle';

  return (
    <div className="space-y-6 font-sans">
      {/* Gelen Bağlantı İstekleri */}
      {incoming.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="text-sm font-bold text-amber-800">Bekleyen Bağlantı İstekleri</h3>
          </div>
          <div className="divide-y divide-amber-100">
            {incoming.map((req) => {
              const party = otherParty(req, org.id);
              return (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 first:pt-0 last:pb-0 gap-3">
                  <div>
                    <span className="font-semibold text-slate-800 text-sm">{party.companyName}</span>
                    <span className="text-xs text-slate-500 font-mono ml-2">({party.vknTc})</span>
                    <p className="text-xs text-slate-400 mt-0.5">İlişki İskonto Oranı: %{req.discountRate}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => respond.mutate({ relationshipId: req.id, accept: true })}
                      disabled={respond.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      Kabul Et
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => respond.mutate({ relationshipId: req.id, accept: false })}
                      disabled={respond.isPending}
                      className="border-rose-200 text-rose-600 hover:bg-rose-50"
                    >
                      Reddet
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Giden Bağlantı İstekleri */}
      {outgoing.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <h3 className="text-sm font-bold text-blue-800">Bekleyen Giden İstekler</h3>
          </div>
          <div className="divide-y divide-blue-100">
            {outgoing.map((req) => {
              const party = otherParty(req, org.id);
              return (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 first:pt-0 last:pb-0 gap-3">
                  <div>
                    <span className="font-semibold text-slate-800 text-sm">{party.companyName}</span>
                    <span className="text-xs text-slate-500 font-mono ml-2">({party.vknTc})</span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Karşı taraf da abone olduğu için onayı bekleniyor.
                    </p>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Onay Bekliyor
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sayfa Başlığı */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Üretici Yönetimi</h1>
          <p className="mt-1 text-sm text-slate-500">Sistemde kayıtlı veya davet ettiğiniz üreticileri yönetin.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setShowInviteModal(true)}
            size="sm"
            variant="secondary"
            className="border-blue-200 text-blue-600 hover:bg-blue-50 font-bold"
          >
            Davet Gönder
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            + Yeni Üretici Ekle
          </Button>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'active'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${activeTab === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          Aktif Üreticiler
          {activeManufacturers.length > 0 && (
            <span className="rounded-full bg-slate-100 text-slate-600 px-1.5 py-0.5 text-xs font-bold">
              {activeManufacturers.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('passive')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'passive'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${activeTab === 'passive' ? 'bg-rose-500' : 'bg-slate-300'}`} />
          Pasif Üreticiler
          {passiveManufacturers.length > 0 && (
            <span className="rounded-full bg-slate-100 text-slate-600 px-1.5 py-0.5 text-xs font-bold">
              {passiveManufacturers.length}
            </span>
          )}
        </button>
      </div>

      {/* Üretici Listesi Kartı */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-6 shadow-sm min-h-[250px]">
        {list.isPending ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : filteredEdges.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Gösterilecek üretici bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full min-w-[800px] border-collapse text-sm text-slate-600">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={TH}>Firma Bilgisi</th>
                  <th className={TH}>Yetkili</th>
                  <th className={TH}>İletişim</th>
                  <th className={`${TH} text-center`}>İndirim</th>
                  <th className={`${TH} text-center`}>Ürün Yönetimi</th>
                  <th className={`${TH} text-right pr-6`}>İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEdges.map((edge) => {
                  const party = otherParty(edge, org.id);
                  const initials = party.companyName.substring(0, 2).toUpperCase();
                  const canEdit = edge.canEditCatalog ?? true;
                  return (
                    <tr key={edge.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className={TD}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="block font-semibold text-slate-800 text-sm">{party.companyName}</span>
                              {party.isSubscriber && (
                                <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600 uppercase tracking-wide">
                                  Üye
                                </span>
                              )}
                            </div>
                            <span className="block font-mono text-[10px] text-slate-400 mt-0.5">VKN: {party.vknTc}</span>
                          </div>
                        </div>
                      </td>
                      <td className={TD}>{party.authorizedName || '—'}</td>
                      <td className={TD}>
                        <div className="space-y-0.5 text-xs text-slate-500 font-medium">
                          {party.email && <div className="block">{party.email}</div>}
                          {party.phone && <div className="block">{party.phone}</div>}
                        </div>
                      </td>
                      <td className={`${TD} text-center`}>
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          % {edge.discountRate || 0}
                        </span>
                      </td>
                      <td className={`${TD} text-center`}>
                        {party.isSubscriber ? (
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold bg-slate-50 text-slate-400 border border-slate-100">
                            Üye yönetir
                          </span>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleCatalog(edge.id, canEdit)}
                              disabled={toggleCatalog.isPending}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                                canEdit ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                  canEdit ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span className={`text-[10px] font-bold ${canEdit ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {canEdit ? 'Açık' : 'Kapalı'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className={`${TD} text-right pr-6`}>
                        <div className="flex justify-end gap-2 text-xs font-medium">
                          {!party.isSubscriber && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditOpen(edge, party)}
                                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 font-bold"
                              >
                                Düzenle
                              </button>
                              <button
                                type="button"
                                onClick={() => setResettingParty(party)}
                                className="rounded border border-yellow-200 bg-yellow-50/50 px-2.5 py-1 text-amber-700 hover:bg-yellow-50 font-bold"
                              >
                                Şifre Sıfırla
                              </button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleToggleStatus(edge.id, edge.status)}
                            className={
                              edge.status === 'active'
                                ? 'border-rose-200 text-rose-600 hover:bg-rose-50 font-bold'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-bold'
                            }
                          >
                            {edge.status === 'active' ? 'Pasif Yap' : 'Aktif Yap'}
                          </Button>
                          {edge.status !== 'active' && (
                            <Button
                              variant="secondary"
                              onClick={() => handleDelete(edge.id)}
                              className="border-red-200 text-red-600 hover:bg-red-50 font-bold"
                            >
                              Sil
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* WhatsApp Üretici Davetleri Bölümü */}
      <div className="space-y-3 pt-6 border-t border-slate-100">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          WhatsApp Üretici Davetleri
        </h2>

        {loadingInv ? (
          <Spinner />
        ) : invitations.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-400">
            Gösterilecek davet bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm w-full">
            <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Davet Edilen Telefon</th>
                  <th className="px-5 py-3.5">Davet Kodu</th>
                  <th className="px-5 py-3.5">Tarih</th>
                  <th className="px-5 py-3.5 text-center">Durum</th>
                  <th className="px-5 py-3.5 text-right pr-6">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invitations.map((inv) => {
                  const state = inviteState(inv);
                  const isPending = state === 'pending';
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 font-semibold text-slate-800">{inv.phone || inv.email || '—'}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-400">{inv.token.substring(0, 8)}...</td>
                      <td className="px-5 py-4 text-slate-500 text-xs">{new Date(inv.createdAt).toLocaleString('tr-TR')}</td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            state === 'used'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : state === 'revoked' || state === 'expired'
                                ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}
                        >
                          {state === 'used' ? 'Kullanıldı' : state === 'revoked' ? 'İptal Edildi' : state === 'expired' ? 'Süresi Doldu' : 'Beklemede'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right pr-6">
                        <div className="flex justify-end gap-2 text-xs font-medium">
                          {isPending && (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleCopyLink(inv.token, inv.id)}
                                className="text-xs font-bold"
                              >
                                {copiedId === inv.id ? 'Kopyalandı!' : 'Linki Kopyala'}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => revokeInvite.mutate({ invitationId: inv.id })}
                                className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold"
                                disabled={revokeInvite.isPending}
                              >
                                İptal Et
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Yeni Üretici Ekle Modalı (Ortak CustomerDialog Bileşeni) */}
      {showAddModal && org && (
        <CustomerDialog
          myKind={org.kind}
          myVknTc={org.vknTc!}
          pending={createCustomer.isPending}
          errorMessage={
            createCustomer.error instanceof Error ? createCustomer.error.message : undefined
          }
          onClose={() => setShowAddModal(false)}
          onSubmit={(input) =>
            createCustomer.mutate(input, {
              onSuccess: () => setShowAddModal(false),
            })
          }
        />
      )}

      {/* Davet Gönderme Modalı */}
      {showInviteModal && (
        <Modal label="Üretici Davet Et" onClose={() => setShowInviteModal(false)}>
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Üretici Davet Et</h2>
              <p className="mt-1 text-sm text-slate-500">
                WhatsApp üzerinden göndermek için bir davet linki ve token oluşturun.
              </p>
            </div>

            {inviteError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg">
                {inviteError}
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Telefon Numarası
                </label>
                <input
                  type="text"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="Örn: 905xxxxxxxxx"
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  E-posta Adresi
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Ornek: uretici@firma.com"
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Firma Adı (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Firma Resmi Unvanı"
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  VKN / T.C. No (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  value={inviteVkn}
                  onChange={(e) => setInviteVkn(e.target.value)}
                  placeholder="Vergi No veya T.C. Kimlik"
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  İskonto Oranı (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={inviteDiscount}
                  onChange={(e) => setInviteDiscount(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="secondary" type="button" onClick={() => setShowInviteModal(false)} disabled={createInvite.isPending}>
                  İptal
                </Button>
                <Button type="submit" disabled={createInvite.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  {createInvite.isPending ? 'Davet Oluşturuluyor...' : 'Davet Oluştur'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Üretici Düzenleme Modalı */}
      {editingParty && (
        <Modal label="Üreticiyi Düzenle" onClose={() => setEditingParty(null)}>
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Üreticiyi Düzenle</h2>
              <p className="mt-1 text-sm text-slate-500">
                Misafir üreticinin detay bilgilerini güncelleyin.
              </p>
            </div>

            {editError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  VKN / T.C. No (Değiştirilemez)
                </label>
                <input
                  type="text"
                  disabled
                  value={editingParty.party.vknTc}
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Firma Unvanı
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Firma Resmi Unvanı"
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Yetkili Kişi
                </label>
                <input
                  type="text"
                  required
                  value={editAuthName}
                  onChange={(e) => setEditAuthName(e.target.value)}
                  placeholder="Ad Soyad"
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  E-posta
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="uretici@firma.com"
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Telefon
                </label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="05xxxxxxxxx"
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Adres
                </label>
                <textarea
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Adres Bilgisi"
                  rows={3}
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="secondary" type="button" onClick={() => setEditingParty(null)} disabled={updateCustomer.isPending}>
                  İptal
                </Button>
                <Button type="submit" disabled={updateCustomer.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  {updateCustomer.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Şifre Sıfırlama Modalı */}
      {resettingParty && (
        <Modal label="Şifre Sıfırla" onClose={() => setResettingParty(null)}>
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Şifre Sıfırla</h2>
              <p className="mt-1 text-sm text-slate-500">
                <strong>{resettingParty.companyName}</strong> üreticisinin misafir hesabı için yeni bir giriş şifresi belirleyin.
              </p>
            </div>

            {resetError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-semibold rounded-lg">
                {resetSuccess}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Yeni Şifre
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="secondary" type="button" onClick={() => setResettingParty(null)} disabled={resetPassword.isPending}>
                  İptal
                </Button>
                <Button type="submit" disabled={resetPassword.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  {resetPassword.isPending ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
      {/* SİL ONAY MODALI */}
      {deleteTargetId && (
        <Modal
          label="Üreticiyi Sil"
          panelClassName="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          onClose={() => setDeleteTargetId(null)}
          closeDisabled={del.isPending}
        >
          <h2 className="text-lg font-extrabold text-slate-800">Üreticiyi Sil</h2>
          <p className="mt-2 text-sm text-slate-600">
            Bu üreticiyi tamamen silmek istediğinize emin misiniz?
          </p>
          {del.isError && (
            <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {del.error instanceof Error ? del.error.message : 'Silinemedi'}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setDeleteTargetId(null)}
              disabled={del.isPending}
            >
              İptal
            </Button>
            <Button
              variant="primary"
              className="!bg-red-600 hover:!bg-red-700"
              loading={del.isPending}
              onClick={() => {
                del.mutate(deleteTargetId, {
                  onSuccess: () => setDeleteTargetId(null),
                });
              }}
            >
              Sil
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
