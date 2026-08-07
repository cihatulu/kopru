import { useState } from 'react';
import {
  AnnouncementDialog,
  AnnouncementList,
  useAnnouncements,
  usePublishAnnouncement,
  useSetAnnouncementActive,
} from '@/features/announcements';
import { useAuthSession } from '@/features/auth';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ORG_KIND } from '@/constants';

/** Duyurular — üretici yayınlar, perakendeci okur. YALNIZ KOMPOZİSYON (A20). */
export default function AnnouncementsPage() {
  const { data: user } = useAuthSession();
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);

  const list = useAnnouncements();
  const publish = usePublishAnnouncement();
  const setActive = useSetAnnouncementActive();

  if (!user?.org) return null;
  const isManufacturer = user.org.kind === ORG_KIND.manufacturer;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Duyurular</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {isManufacturer
              ? 'Yayınladığınız duyurular, aktif ilişkiniz olan perakendecilere görünür.'
              : 'Tedarikçilerinizin yayınladığı duyurular.'}
          </p>
        </div>
        {isManufacturer && <Button onClick={() => setCreating(true)}>Yeni duyuru</Button>}
      </div>

      {list.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <AnnouncementList
          announcements={list.data?.pages.flat() ?? []}
          isOwnerView={isManufacturer}
          busyId={busyId}
          onToggleActive={(a) => {
            setBusyId(a.id);
            setActive.mutate(
              { id: a.id, isActive: !a.isActive },
              { onSettled: () => setBusyId(undefined) },
            );
          }}
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
        <AnnouncementDialog
          pending={publish.isPending}
          errorMessage={publish.isError ? 'Yayınlanamadı. Tekrar deneyin.' : undefined}
          onClose={() => {
            setCreating(false);
            publish.reset();
          }}
          onSubmit={(v) =>
            publish.mutate(
              { ownerOrgId: user.org.id, ...v },
              { onSuccess: () => setCreating(false) },
            )
          }
        />
      )}
    </div>
  );
}
