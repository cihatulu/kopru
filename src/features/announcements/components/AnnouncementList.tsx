import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/format';
import type { Announcement } from '../api/useAnnouncements';

interface Props {
  announcements: Announcement[];
  /** Üretici kendi duyurularını yönetir; perakendeci yalnız okur. */
  isOwnerView: boolean;
  busyId?: string | undefined;
  onToggleActive: (a: Announcement) => void;
}

export function AnnouncementList({ announcements, isOwnerView, busyId, onToggleActive }: Props) {
  if (announcements.length === 0) {
    return (
      <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
        {isOwnerView ? 'Henüz duyuru yayınlamadınız.' : 'Görüntülenecek duyuru yok.'}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {announcements.map((a) => (
        <li
          key={a.id}
          className={`rounded-xl bg-white p-5 ring-1 ring-inset ${
            a.isActive ? 'ring-slate-200' : 'ring-slate-100 opacity-60'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-900">{a.title}</p>
                {a.targetRetailerOrgId && (
                  <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    Özel
                  </span>
                )}
                {!a.isActive && (
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    Yayında değil
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {!isOwnerView && `${a.ownerName} · `}
                {formatDateTime(a.createdAt)}
              </p>
            </div>

            {isOwnerView && (
              <Button variant="ghost" loading={busyId === a.id} onClick={() => onToggleActive(a)}>
                {a.isActive ? 'Yayından kaldır' : 'Yayınla'}
              </Button>
            )}
          </div>

          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {a.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
