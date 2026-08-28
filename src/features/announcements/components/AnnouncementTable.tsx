import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TBODY, TD, TH, THEAD, TH_NUM } from '@/components/ui/Table';
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

/**
 * Üreticinin kendi duyurularını yönettiği tablo / kartlar.
 * Masaüstünde geniş tablo, mobilde Akıllı Kartlar.
 */
export function AnnouncementTable({
  announcements,
  retailers,
  busyId,
  onEdit,
  onDeactivate,
}: Props) {
  if (announcements.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-xs font-semibold text-slate-400">
        Henüz yayınlanmış bir duyuru yok.
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 📱 MOBİL GÖRÜNÜM: Akıllı Kartlar (Card View) — md altı ekranlar için */}
      <div className="space-y-3.5 md:hidden">
        {announcements.map((a) => {
          const targetName = a.targetRetailerOrgId
            ? retailers.find((r) => r.id === a.targetRetailerOrgId)?.name ?? 'Bilinmiyor'
            : null;

          return (
            <div
              key={a.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04] transition-all hover:shadow-md hover:shadow-slate-200/80"
            >
              {/* Kart Başlığı: Başlık & Hedef Rozeti */}
              <div className="flex items-start justify-between gap-2.5 border-b border-slate-100 pb-3">
                <span className="text-sm font-bold text-slate-900 truncate flex-1" title={a.title}>
                  {a.title}
                </span>

                <div className="shrink-0">
                  {targetName ? (
                    <Badge size="sm">Özel: {targetName}</Badge>
                  ) : (
                    <Badge size="sm" tone="brand">
                      Genel
                    </Badge>
                  )}
                </div>
              </div>

              {/* Kart Gövdesi: İçerik & Tarih */}
              <div className="py-3 text-xs">
                <p className="text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 line-clamp-3">
                  {a.body}
                </p>

                <div className="mt-2.5 flex items-center justify-between text-slate-400 text-[11px] font-medium">
                  <span>Yayın Tarihi:</span>
                  <span className="text-slate-600 font-semibold">{formatDate(a.createdAt)}</span>
                </div>
              </div>

              {/* Kart Aksiyonları */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="secondary" size="sm" onClick={() => onEdit(a)} className="text-xs">
                  Düzenle
                </Button>
                <Button
                  variant="dangerGhost"
                  size="sm"
                  disabled={busyId === a.id}
                  onClick={() => onDeactivate(a)}
                  className="text-xs"
                >
                  Sil
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: Geniş Tablo (md ve üzeri ekranlar) */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="scrollbar-thin table-scroll-shadow w-full overflow-x-auto">
          <table className="min-w-[800px] lg:min-w-full">
            <thead className={THEAD}>
              <tr>
                <th className={TH}>Başlık</th>
                <th className={TH}>Hedef</th>
                <th className={TH}>İçerik</th>
                <th className={TH}>Tarih</th>
                <th className={`${TH_NUM} w-[200px]`}>İşlemler</th>
              </tr>
            </thead>
            <tbody className={`${TBODY} bg-white`}>
              {announcements.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-slate-50/70">
                  <td className={`${TD} whitespace-nowrap font-semibold text-slate-900`}>
                    {a.title}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    {a.targetRetailerOrgId ? (
                      <Badge size="sm">
                        Özel:{' '}
                        {retailers.find((r) => r.id === a.targetRetailerOrgId)?.name ?? 'Bilinmiyor'}
                      </Badge>
                    ) : (
                      <Badge size="sm" tone="brand">
                        Genel
                      </Badge>
                    )}
                  </td>
                  <td className={`${TD} max-w-sm truncate text-xs text-slate-500`} title={a.body}>
                    {a.body}
                  </td>
                  <td className={`${TD} whitespace-nowrap text-xs text-slate-500`}>
                    {formatDate(a.createdAt)}
                  </td>
                  <td className={`${TD} whitespace-nowrap text-right`}>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => onEdit(a)}>
                        Düzenle
                      </Button>
                      <Button
                        variant="dangerGhost"
                        size="sm"
                        disabled={busyId === a.id}
                        onClick={() => onDeactivate(a)}
                      >
                        Sil
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
