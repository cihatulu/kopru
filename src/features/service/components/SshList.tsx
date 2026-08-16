import { Button } from '@/components/ui/Button';
import { TBODY, TD, TH, THEAD, TH_NUM } from '@/components/ui/Table';
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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto w-full">
        <table className="min-w-[850px] w-full text-left text-xs">
          <thead className={THEAD}>
            <tr>
              <th className={TH}>TARİH</th>
              {isManufacturer && <th className={TH}>PERAKENDECİ</th>}
              <th className={TH}>SİPARİŞ NO</th>
              <th className={TH}>SSH KODU</th>
              <th className={TH}>SON KULLANICI</th>
              <th className={TH}>AÇIKLAMA</th>
              <th className={TH}>DURUM</th>
              <th className={TH_NUM}>İŞLEMLER</th>
            </tr>
          </thead>
          <tbody className={TBODY}>
            {requests.map((r) => {
              const meta = SSH_STATUS_META[r.status];
              const isOwnerManufacturer = r.manufacturerOrgId === myOrgId;

              return (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className={`${TD} text-slate-400 whitespace-nowrap`}>{formatDate(r.createdAt)}</td>
                  {isManufacturer && (
                    <td className={`${TD} font-bold text-slate-800`}>{r.counterpartyName}</td>
                  )}
                  <td className={`${TD} font-mono font-bold text-slate-800`}>{r.orderNo}</td>
                  <td className={`${TD} font-mono font-black text-slate-900`}>{r.sshCode}</td>
                  <td className={`${TD} text-slate-700 font-semibold`}>{r.customerName || '—'}</td>
                  <td className={`${TD} text-slate-500 max-w-xs truncate`} title={r.description || r.title}>
                    {r.description || r.title}
                  </td>
                  <td className={TD}>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ${meta.className}`}>
                      {meta.label}
                    </span>
                  </td>
                  <td className={`${TD} text-right whitespace-nowrap`}>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => onOpen(r)}>
                        İncele
                      </Button>
                      {isOwnerManufacturer && onOpenStatusModal && (
                        <Button variant="secondary" size="sm" onClick={() => onOpenStatusModal(r)}>
                          Güncelle
                        </Button>
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
