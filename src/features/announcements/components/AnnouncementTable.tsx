import { formatDate } from '@/lib/format';
import type { Announcement } from '../api/useAnnouncements';

interface Props {
  announcements: Announcement[];
  /** Hedef org kimliğini insan okunur ada çevirmek için. */
  retailers: { id: string; name: string }[];
  busyId?: string | undefined;
  onEdit: (a: Announcement) => void;
  onDeactivate: (a: Announcement) => void;
}

const ACTION =
  'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-extrabold shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50';

/** Üreticinin kendi duyurularını yönettiği tablo. */
export function AnnouncementTable({
  announcements,
  retailers,
  busyId,
  onEdit,
  onDeactivate,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="scrollbar-thin table-scroll-shadow w-full overflow-x-auto">
        <table className="min-w-[800px] text-sm lg:min-w-full">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr className="border-b border-slate-100">
              <th className="px-5 py-3.5">Başlık</th>
              <th className="px-5 py-3.5">Hedef</th>
              <th className="px-5 py-3.5">İçerik</th>
              <th className="px-5 py-3.5">Tarih</th>
              <th className="w-[200px] px-5 py-3.5 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {announcements.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <p className="text-xs font-semibold text-slate-400">
                    Henüz yayınlanmış bir duyuru yok.
                  </p>
                </td>
              </tr>
            ) : (
              announcements.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-slate-50/40">
                  <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-slate-800">
                    {a.title}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    {a.targetRetailerOrgId ? (
                      <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                        Özel: {retailers.find((r) => r.id === a.targetRetailerOrgId)?.name ?? 'Bilinmiyor'}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        Genel (Herkese)
                      </span>
                    )}
                  </td>
                  <td className="max-w-sm truncate px-5 py-4 text-xs text-slate-500" title={a.body}>
                    {a.body}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-400">
                    {formatDate(a.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(a)}
                        className={`${ACTION} border-orange-100/60 bg-orange-50 text-orange-700 hover:bg-orange-100/80`}
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => onDeactivate(a)}
                        className={`${ACTION} border-rose-100/60 bg-rose-50 text-rose-700 hover:bg-rose-100/80`}
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
