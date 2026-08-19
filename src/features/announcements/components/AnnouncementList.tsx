import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/format';
import type { Announcement } from '../api/useAnnouncements';

interface Props {
  announcements: Announcement[];
  /** Üretici kendi duyurularını yönetir; perakendeci yalnız okur. */
  isOwnerView: boolean;
  busyId?: string | undefined;
  onToggleActive: (a: Announcement) => void;
  onDelete?: (a: Announcement) => void;
  deletingId?: string | undefined;
}

export function AnnouncementList({
  announcements,
  isOwnerView,
  busyId,
  onToggleActive,
  onDelete,
  deletingId,
}: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

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
                  <span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
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

            <div className="flex items-center gap-2">
              {isOwnerView && (
                <Button variant="ghost" loading={busyId === a.id} onClick={() => onToggleActive(a)}>
                  {a.isActive ? 'Yayından kaldır' : 'Yayınla'}
                </Button>
              )}

              {/* Perakendeci silme butonu */}
              {!isOwnerView && onDelete && (
                confirmId === a.id ? (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 ring-1 ring-inset ring-red-200">
                    <span className="text-xs font-medium text-red-700">Emin misiniz?</span>
                    <Button
                      variant="ghost"
                      loading={deletingId === a.id}
                      onClick={() => {
                        onDelete(a);
                        setConfirmId(null);
                      }}
                    >
                      <span className="text-xs font-bold text-red-700">Evet</span>
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmId(null)}>
                      <span className="text-xs text-slate-500">Vazgeç</span>
                    </Button>
                  </div>
                ) : (
                  <button
                    aria-label="Duyuruyu sil"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    onClick={() => setConfirmId(a.id)}
                  >
                    🗑
                  </button>
                )
              )}
            </div>
          </div>

          {a.imageUrl && (
            <div className="mt-3 max-w-md overflow-hidden rounded-xl border border-slate-100 shadow-sm">
              <img src={a.imageUrl} alt={a.title} className="h-48 w-full object-cover" />
            </div>
          )}

          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {a.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
