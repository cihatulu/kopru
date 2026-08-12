import { useState, useEffect } from 'react';
import {
  AnnouncementDialog,
  AnnouncementList,
  useAnnouncements,
  usePublishAnnouncement,
  useUpdateAnnouncement,
  useSetAnnouncementActive,
  useUnreadAnnouncements,
  type Announcement,
} from '@/features/announcements';
import { otherParty, useCounterparties } from '@/features/counterparties';
import { useAuthSession } from '@/features/auth';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ORG_KIND } from '@/constants';
import { formatDate } from '@/lib/format';

export default function AnnouncementsPage() {
  const { data: user } = useAuthSession();
  const [creating, setCreating] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  const list = useAnnouncements();
  const publish = usePublishAnnouncement();
  const update = useUpdateAnnouncement();
  const setActive = useSetAnnouncementActive();
  const { markAllAsRead } = useUnreadAnnouncements();

  useEffect(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  // Active counterparties/retailers list
  const edges = (useCounterparties().data?.pages.flat() ?? []).filter((e) => e.status === 'active');

  if (!user?.org) return null;
  const myOrgId = user.org.id;
  const isManufacturer = user.org.kind === ORG_KIND.manufacturer;

  const retailers = [
    ...new Map(
      edges.map((e) => {
        const p = otherParty(e, myOrgId);
        return [p.id, { id: p.id, name: p.companyName }] as [string, { id: string; name: string }];
      }),
    ).values(),
  ];

  const handleCreateSubmit = (v: { title: string; body: string; targetRetailerOrgId?: string | null; imageUrl?: string | null }) => {
    publish.mutate(
      {
        ownerOrgId: myOrgId,
        title: v.title,
        body: v.body,
        targetRetailerOrgId: v.targetRetailerOrgId,
        imageUrl: v.imageUrl,
      },
      {
        onSuccess: () => {
          setCreating(false);
        },
      },
    );
  };

  const handleEditSubmit = (v: { title: string; body: string; targetRetailerOrgId?: string | null; imageUrl?: string | null }) => {
    if (!editingAnnouncement) return;
    update.mutate(
      {
        id: editingAnnouncement.id,
        title: v.title,
        body: v.body,
        targetRetailerOrgId: v.targetRetailerOrgId,
        imageUrl: v.imageUrl,
      },
      {
        onSuccess: () => {
          setEditingAnnouncement(null);
        },
      },
    );
  };

  // Only show active announcements
  const allAnnouncements = list.data?.pages.flat() ?? [];
  const activeAnnouncements = allAnnouncements.filter((a) => a.isActive);

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isManufacturer ? 'Duyuru Yönetimi' : 'Duyurular'}
          </h1>
          <p className="text-slate-500 mt-1 text-xs">
            {isManufacturer
              ? 'Müşterilerinize iletmek istediğiniz kampanya veya bilgilendirmeleri yayınlayın.'
              : 'Tedarikçilerinizin yayınladığı duyurular.'}
          </p>
        </div>
        {isManufacturer && (
          <button
            type="button"
            onClick={() => {
              setEditingAnnouncement(null);
              setCreating(true);
            }}
            className="bg-slate-900 hover:bg-slate-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Yeni Duyuru Yayınla
          </button>
        )}
      </div>

      {list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : isManufacturer ? (
        /* Üretici Tablo Görünümü */
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto w-full scrollbar-thin table-scroll-shadow">
            <table className="min-w-[800px] lg:min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3.5">Başlık</th>
                  <th className="px-5 py-3.5">Hedef</th>
                  <th className="px-5 py-3.5">İçerik</th>
                  <th className="px-5 py-3.5">Tarih</th>
                  <th className="px-5 py-3.5 text-right w-[200px]">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {activeAnnouncements.length > 0 ? (
                  activeAnnouncements.map((a) => {
                    const retailerName = retailers.find((r) => r.id === a.targetRetailerOrgId)?.name;
                    return (
                      <tr key={a.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-slate-800">
                          {a.title}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {a.targetRetailerOrgId ? (
                            <span className="px-2.5 py-0.5 inline-flex text-[10px] font-bold rounded-full bg-blue-50 border border-blue-200 text-blue-700">
                              Özel: {retailerName || 'Bilinmiyor'}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 inline-flex text-[10px] font-bold rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                              Genel (Herkese)
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500 max-w-sm truncate" title={a.body}>
                          {a.body}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-400">
                          {formatDate(a.createdAt)}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingAnnouncement(a)}
                              className="inline-flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100/80 text-orange-700 border border-orange-100/60 text-[10px] font-extrabold px-3 py-2 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              Düzenle
                            </button>
                            <button
                              type="button"
                              disabled={busyId === a.id}
                              onClick={() => {
                                setBusyId(a.id);
                                setActive.mutate(
                                  { id: a.id, isActive: false },
                                  { onSettled: () => setBusyId(undefined) },
                                );
                              }}
                              className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-100/60 text-[10px] font-extrabold px-3 py-2 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-450 border border-slate-100 text-lg">
                          📢
                        </div>
                        <p className="text-xs font-semibold text-slate-400">Henüz yayınlanmış bir duyuru yok.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Perakendeci Liste Görünümü */
        <AnnouncementList
          announcements={activeAnnouncements}
          isOwnerView={false}
          busyId={busyId}
          onToggleActive={() => {}}
        />
      )}

      {/* Daha Fazla Yükle Butonu */}
      {list.hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="secondary"
            loading={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
          >
            Daha fazla yükle
          </Button>
        </div>
      )}

      {/* Yeni Duyuru Yayınla Modalı */}
      {creating && (
        <AnnouncementDialog
          customers={retailers}
          ownerOrgId={myOrgId}
          pending={publish.isPending}
          onClose={() => {
            setCreating(false);
            publish.reset();
          }}
          onSubmit={handleCreateSubmit}
        />
      )}

      {/* Duyuruyu Düzenle Modalı */}
      {editingAnnouncement && (
        <AnnouncementDialog
          announcement={editingAnnouncement}
          customers={retailers}
          ownerOrgId={myOrgId}
          pending={update.isPending}
          onClose={() => {
            setEditingAnnouncement(null);
            update.reset();
          }}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  );
}
