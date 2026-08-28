import { useEffect, useMemo, useState } from 'react';
import {
  AnnouncementDialog,
  AnnouncementList,
  AnnouncementTable,
  AnnouncementsHeader,
  useAnnouncements,
  useDeleteAnnouncement,
  usePublishAnnouncement,
  useSetAnnouncementActive,
  useUnreadAnnouncements,
  useUpdateAnnouncement,
  type Announcement,
} from '@/features/announcements';
import { otherParty, useCounterparties } from '@/features/counterparties';
import { useAuthSession } from '@/features/auth';
import { ListFooter } from '@/components/ui/ListFooter';
import { Spinner } from '@/components/ui/Spinner';
import { ORG_KIND } from '@/constants';

/** Duyurular — YALNIZ KOMPOZİSYON (A20). */
export default function AnnouncementsPage() {
  const { data: user } = useAuthSession();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  const list = useAnnouncements();
  const publish = usePublishAnnouncement();
  const update = useUpdateAnnouncement();
  const setActive = useSetAnnouncementActive();
  const deleteAnn = useDeleteAnnouncement();
  const { markAllAsRead } = useUnreadAnnouncements();
  const counterparties = useCounterparties();

  useEffect(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  const myOrgId = user?.org?.id;

  // Aynı perakendeci birden çok ilişkiden gelebilir; kimliğe göre tekilleştirilir.
  const retailers = useMemo(() => {
    if (!myOrgId) return [];
    const edges = (counterparties.data?.pages.flat() ?? []).filter(
      (e) => e.status === 'active' && (e.manufacturerOrgId === myOrgId || e.retailer.id === myOrgId),
    );
    const byId = new Map(
      edges.map((e) => {
        const p = otherParty(e, myOrgId);
        return [p.id, { id: p.id, name: p.companyName }];
      }),
    );
    return [...byId.values()];
  }, [counterparties.data, myOrgId]);

  const active = useMemo(
    () => (list.data?.pages.flat() ?? []).filter((a) => a.isActive),
    [list.data],
  );

  if (!user?.org || !myOrgId) return null;
  const isManufacturer = user.org.kind === ORG_KIND.manufacturer;

  return (
    <div className="space-y-6 text-slate-800">
      <AnnouncementsHeader
        isManufacturer={isManufacturer}
        onCreate={() => {
          setEditing(null);
          setCreating(true);
        }}
      />

      {list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : isManufacturer ? (
        <AnnouncementTable
          announcements={active}
          retailers={retailers}
          busyId={busyId}
          onEdit={setEditing}
          onDeactivate={(a) => {
            setBusyId(a.id);
            setActive.mutate(
              { id: a.id, isActive: false },
              { onSettled: () => setBusyId(undefined) },
            );
          }}
        />
      ) : (
        <AnnouncementList
          announcements={active}
          isOwnerView={false}
          busyId={busyId}
          onToggleActive={() => {}}
          onDelete={(a) => {
            setBusyId(a.id);
            deleteAnn.mutate(
              { id: a.id, retailerOrgId: myOrgId },
              { onSettled: () => setBusyId(undefined) },
            );
          }}
          deletingId={deleteAnn.isPending ? busyId : undefined}
        />
      )}

      <ListFooter
        label={`Toplam ${active.length} duyuru`}
        hasMore={list.hasNextPage}
        loading={list.isFetchingNextPage}
        onLoadMore={() => void list.fetchNextPage()}
      />

      {creating && (
        <AnnouncementDialog
          customers={retailers}
          ownerOrgId={myOrgId}
          pending={publish.isPending}
          onClose={() => {
            setCreating(false);
            publish.reset();
          }}
          onSubmit={(v) =>
            publish.mutate(
              { ownerOrgId: myOrgId, ...v },
              { onSuccess: () => setCreating(false) },
            )
          }
        />
      )}

      {editing && (
        <AnnouncementDialog
          announcement={editing}
          customers={retailers}
          ownerOrgId={myOrgId}
          pending={update.isPending}
          onClose={() => {
            setEditing(null);
            update.reset();
          }}
          onSubmit={(v) =>
            update.mutate({ id: editing.id, ...v }, { onSuccess: () => setEditing(null) })
          }
        />
      )}
    </div>
  );
}
