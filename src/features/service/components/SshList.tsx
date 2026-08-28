import { formatDate } from '@/lib/format';
import { SSH_STATUS_META } from '../domain/labels';
import type { SshRequest } from '../api/useSshRequests';
import { Button } from '@/components/ui/Button';

interface Props {
  requests: SshRequest[];
  myOrgId: string;
  isManufacturer?: boolean;
  isRetailer?: boolean;
  onOpen: (r: SshRequest) => void;
  onOpenStatusModal?: ((r: SshRequest) => void) | undefined;
  onRetailerAction?: ((r: SshRequest, nextStatus: 'iptal' | 'tamamlandi') => void) | undefined;
}

export function SshList({
  requests,
  myOrgId,
  isManufacturer = false,
  isRetailer = false,
  onOpen,
  onOpenStatusModal,
  onRetailerAction,
}: Props) {
  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-xs font-semibold text-slate-400">
        Henüz gösterilecek SSH (servis) talebi bulunmuyor.
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 📱 MOBİL GÖRÜNÜM: Akıllı Kartlar (Card View) — md altı ekranlar için */}
      <div className="space-y-3.5 md:hidden">
        {requests.map((r) => {
          const meta = SSH_STATUS_META[r.status];
          const isOwnerManufacturer = r.manufacturerOrgId === myOrgId;
          const isClosed = r.status === 'tamamlandi' || r.status === 'iptal';

          const retailerBtn = isRetailer && !isClosed && onRetailerAction ? (
            r.status === 'parca_gonderildi' ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onRetailerAction(r, 'tamamlandi')}
                className="w-full justify-center text-xs"
              >
                ✓ Tamamlandı Olarak İşaretle
              </Button>
            ) : (r.status === 'bekliyor' || r.status === 'inceleniyor') ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onRetailerAction(r, 'iptal')}
                className="w-full justify-center text-xs text-red-600 hover:bg-red-50"
              >
                Talebi İptal Et
              </Button>
            ) : null
          ) : null;

          return (
            <div
              key={r.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.04] transition-all hover:shadow-md hover:shadow-slate-200/80"
            >
              {/* Kart Başlığı: SSH Kodu & Durum Rozeti */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-sm font-black text-slate-900 tracking-tight">
                      {r.sshCode}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-xs font-bold text-slate-500">
                    Sipariş: {r.orderNo}
                  </p>
                </div>

                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold shrink-0 ${meta.className}`}>
                  {meta.label}
                </span>
              </div>

              {/* Kart Gövdesi: Tam Simetrik 2 Sütunlu Izgara */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 bg-slate-50/60 rounded-xl p-3 my-3 border border-slate-100 text-xs">
                {/* Sol Üst: Perakendeci / Üretici */}
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {isManufacturer ? 'Perakendeci' : 'Üretici'}
                  </span>
                  <span className="font-extrabold text-slate-900 truncate block mt-0.5" title={r.counterpartyName}>
                    {r.counterpartyName}
                  </span>
                </div>

                {/* Sağ Üst: Son Müşteri (Sağa Hizalı, Tarihin Tam Üstünde) */}
                <div className="text-right min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Son Müşteri
                  </span>
                  <span className="font-extrabold text-slate-900 truncate block mt-0.5" title={r.customerName || '—'}>
                    {r.customerName || '—'}
                  </span>
                </div>

                {/* Sol Alt: Talep Tarihi Etiketi */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Talep Tarihi
                  </span>
                </div>

                {/* Sağ Alt: Tarih Değeri (Sağa Hizalı) */}
                <div className="pt-2 border-t border-slate-100 text-right">
                  <span className="font-bold text-slate-700 block">
                    {formatDate(r.createdAt)}
                  </span>
                </div>
              </div>

              {/* Kart Aksiyonları */}
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpen(r)}
                    className="flex-1 justify-center text-xs font-bold"
                  >
                    Talebi İncele
                  </Button>

                  {isOwnerManufacturer && onOpenStatusModal && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={r.status === 'tamamlandi' || r.status === 'iptal'}
                      onClick={() => onOpenStatusModal(r)}
                      className="flex-1 justify-center text-xs font-bold"
                    >
                      Durum Güncelle
                    </Button>
                  )}
                </div>

                {retailerBtn}
              </div>
            </div>
          );
        })}
      </div>

      {/* 🖥️ MASAÜSTÜ GÖRÜNÜM: Geniş Tablo (md ve üzeri ekranlar) */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto w-full">
          <table className="min-w-[850px] w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 font-extrabold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-3.5">SSH KODU</th>
                <th className="px-6 py-3.5">SİPARİŞ NO</th>
                <th className="px-6 py-3.5">{isManufacturer ? 'PERAKENDECİ' : 'ÜRETİCİ'}</th>
                <th className="px-6 py-3.5">SON MÜŞTERİ</th>
                <th className="px-6 py-3.5">DURUM</th>
                <th className="px-6 py-3.5">TALEP TARİHİ</th>
                <th className="px-6 py-3.5 text-right">İŞLEMLER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {requests.map((r) => {
                const meta = SSH_STATUS_META[r.status];
                const isOwnerManufacturer = r.manufacturerOrgId === myOrgId;
                const isClosed = r.status === 'tamamlandi' || r.status === 'iptal';

                return (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{r.sshCode}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">{r.orderNo}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{r.counterpartyName}</td>
                    <td className="px-6 py-4 font-medium text-slate-600">{r.customerName || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border ${meta.className}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpen(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
                        >
                          İncele
                        </button>

                        {isOwnerManufacturer && onOpenStatusModal && (
                          <button
                            type="button"
                            disabled={r.status === 'tamamlandi' || r.status === 'iptal'}
                            onClick={() => onOpenStatusModal(r)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            Durum
                          </button>
                        )}

                        {isRetailer && !isClosed && onRetailerAction && (
                          <>
                            {r.status === 'parca_gonderildi' && (
                              <button
                                type="button"
                                onClick={() => onRetailerAction(r, 'tamamlandi')}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                              >
                                Tamamla
                              </button>
                            )}
                            {(r.status === 'bekliyor' || r.status === 'inceleniyor') && (
                              <button
                                type="button"
                                onClick={() => onRetailerAction(r, 'iptal')}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                              >
                                İptal
                              </button>
                            )}
                          </>
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
    </div>
  );
}
