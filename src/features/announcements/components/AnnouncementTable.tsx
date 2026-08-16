import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TBODY, TD, TH, THEAD, TH_NUM, TableEmpty } from '@/components/ui/Table';
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
 * Üreticinin kendi duyurularını yönettiği tablo.
 *
 * Satır eylemleri kehribar ve gül renginde dolu etiketlerdi ve üzerine
 * gelince `hover:scale-105` ile büyüyorlardı — tablo satırında büyüyen
 * bir düğme, altındaki satırı örtüyordu. İkisi de ortak düğmeye alındı:
 * "Düzenle" ikincil, "Sil" yıkıcı ama zeminsiz.
 */
export function AnnouncementTable({
  announcements,
  retailers,
  busyId,
  onEdit,
  onDeactivate,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
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
            {announcements.length === 0 ? (
              <TableEmpty colSpan={5}>Henüz yayınlanmış bir duyuru yok.</TableEmpty>
            ) : (
              announcements.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-slate-50/70">
                  <td className={`${TD} whitespace-nowrap font-semibold text-slate-900`}>
                    {a.title}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    {/*
                      Hedef ayrımı renkle değil, ETİKETLE okunur. "Özel" ile
                      "Genel" farkı mavi/yeşil ayrımından anlaşılmıyordu;
                      ikisi de nötr, ayrımı yazı taşıyor.
                    */}
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
