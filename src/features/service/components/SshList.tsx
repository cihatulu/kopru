import { SSH_STATUS_META } from '../domain/labels';
import type { SshRequest } from '../api/useSshRequests';
import { formatDate } from '@/lib/format';

interface Props {
  requests: SshRequest[];
  myOrgId: string;
  isManufacturer?: boolean;
  onOpen: (r: SshRequest) => void;
  onOpenStatusModal?: (r: SshRequest) => void;
}

export function SshList({
  requests,
  myOrgId,
  isManufacturer = false,
  onOpen,
  onOpenStatusModal,
}: Props) {
  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-xs font-semibold text-slate-400">
        Henüz gösterilecek SSH (servis) talebi bulunmuyor.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="overflow-x-auto w-full">
        <table className="min-w-[850px] w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/70 font-extrabold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-3.5">TARİH</th>
              {isManufacturer && <th className="px-5 py-3.5">PERAKENDECİ</th>}
              <th className="px-5 py-3.5">SİPARİŞ NO</th>
              <th className="px-5 py-3.5">SSH KODU</th>
              <th className="px-5 py-3.5">SON KULLANICI</th>
              <th className="px-5 py-3.5">AÇIKLAMA</th>
              <th className="px-5 py-3.5">DURUM</th>
              <th className="px-5 py-3.5 text-right">İŞLEMLER</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {requests.map((r) => {
              const meta = SSH_STATUS_META[r.status];
              const isOwnerManufacturer = r.manufacturerOrgId === myOrgId;

              return (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 text-slate-400 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  {isManufacturer && (
                    <td className="px-5 py-4 font-bold text-slate-800">{r.counterpartyName}</td>
                  )}
                  <td className="px-5 py-4 font-mono font-bold text-slate-800">{r.orderNo}</td>
                  <td className="px-5 py-4 font-mono font-black text-slate-900">{r.sshCode}</td>
                  <td className="px-5 py-4 text-slate-700 font-semibold">{r.customerName || '—'}</td>
                  <td className="px-5 py-4 text-slate-500 max-w-xs truncate" title={r.description || r.title}>
                    {r.description || r.title}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ${meta.className}`}>
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onOpen(r)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 text-xs shadow-2xs transition-colors cursor-pointer"
                      >
                        İncele
                      </button>
                      {isOwnerManufacturer && onOpenStatusModal && (
                        <button
                          type="button"
                          onClick={() => onOpenStatusModal(r)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 text-xs shadow-2xs transition-colors cursor-pointer"
                        >
                          Güncelle
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
