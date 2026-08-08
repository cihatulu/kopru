import { SSH_STATUS_META } from '../domain/labels';
import type { SshLogEntry } from '../api/useSshDetail';

/**
 * Servis talebinin zaman çizelgesi.
 *
 * `from_status` boş olan ilk satır talebin açılışıdır — geçiş değil, doğuş.
 * Bu ayrımı yapmazsak çizelgenin ilk satırı "— → bekliyor" diye okunur.
 */
export function StatusTimeline({ logs, myOrgId }: { logs: SshLogEntry[]; myOrgId: string }) {
  if (logs.length === 0) {
    return <p className="text-sm text-slate-500">Henüz durum kaydı yok.</p>;
  }

  return (
    <ol className="space-y-3">
      {logs.map((log) => {
        const meta = SSH_STATUS_META[log.toStatus];
        const mine = log.actorOrgId === myOrgId;

        return (
          <li key={log.id} className="flex gap-3">
            <div className="mt-1.5 flex flex-col items-center">
              <span className="h-2 w-2 shrink-0 rounded-full bg-slate-400" />
              <span className="mt-1 w-px flex-1 bg-slate-200" />
            </div>

            <div className="flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}>
                  {log.fromStatus === null ? 'Talep açıldı' : meta.label}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(log.createdAt).toLocaleString('tr-TR')}
                </span>
                <span className="text-xs text-slate-400">· {mine ? 'siz' : 'karşı taraf'}</span>
              </div>
              {log.note && <p className="mt-1 text-sm text-slate-600">{log.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
