import { Button } from '@/components/ui/Button';
import { formatDateTime, formatMoney } from '@/lib/format';
import { RETURN_STATUS_META } from '../domain/labels';
import type { ReturnRequest } from '../api/useReturnRequests';

interface Props {
  request: ReturnRequest;
  myOrgId: string;
  busyId?: string | undefined;
  onClose: () => void;
  onDecide: (r: ReturnRequest, approve: boolean) => void;
}

export function ReturnDetailModal({ request, myOrgId, busyId, onClose, onDecide }: Props) {
  const meta = RETURN_STATUS_META[request.status];
  const canDecide = request.status === 'pending' && request.manufacturerOrgId === myOrgId;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden text-left">
        {/* Header */}
        <div className="flex justify-between items-start px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900">İade Talebi Detayı</h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Sipariş: <span className="font-mono font-bold text-slate-700">{request.orderNo}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${meta.className}`}>
              {meta.label}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-xl font-light cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Section 1: İADE EDİLEN ÜRÜNLER */}
          <div className="space-y-2">
            <p className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400">
              İADE EDİLEN ÜRÜNLER
            </p>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-2">
              {request.items && request.items.length > 0 ? (
                request.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1">
                    <span className="font-bold text-slate-800">{item.name}</span>
                    <span className="font-medium text-slate-500">{item.quantity} adet</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 italic">Ürün bilgisi bulunamadı.</p>
              )}
            </div>
          </div>

          {/* Section 2: İADE NEDENİ */}
          <div className="space-y-2">
            <p className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400">
              İADE NEDENİ
            </p>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 text-slate-700 font-medium">
              {request.reason || <span className="text-slate-400 italic">Neden belirtilmemiş.</span>}
            </div>
          </div>

          {/* Section 3: SÜREÇ (TIMELINE) */}
          <div className="space-y-2">
            <p className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400">
              SÜREÇ
            </p>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
              {/* Step 1: Talep Oluşturuldu */}
              <div className="flex gap-3">
                <div className="relative flex flex-col items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 mt-1" />
                  {request.status !== 'pending' && (
                    <span className="w-0.5 flex-1 bg-slate-200 my-1" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-800">Talep Oluşturuldu</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(request.createdAt)}</p>
                </div>
              </div>

              {/* Step 2: Sonuç (Onaylandı / Reddedildi) */}
              {request.status === 'approved' && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-700">Onaylandı</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formatDateTime(request.decidedAt || request.createdAt)}
                    </p>
                    {request.approvedAmount !== null && (
                      <p className="mt-1 font-bold text-emerald-800">
                        Cari Hesaba Yansıtılan İade Tutarı: {formatMoney(request.approvedAmount)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {request.status === 'rejected' && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1" />
                  </div>
                  <div>
                    <p className="font-bold text-rose-700">Reddedildi</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formatDateTime(request.decidedAt || request.createdAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5 flex-shrink-0">
          {canDecide && (
            <>
              <Button
                variant="danger"
                disabled={busyId === request.id}
                onClick={() => onDecide(request, false)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Reddet
              </Button>
              <Button
                loading={busyId === request.id}
                onClick={() => onDecide(request, true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Onayla
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </div>
    </div>
  );
}
