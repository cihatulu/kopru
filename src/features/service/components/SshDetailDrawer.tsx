import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { SSH_STATUS_META } from '../domain/labels';
import { useSshDetail } from '../api/useSshDetail';
import { PhotoUploader } from './PhotoUploader';
import { formatDateTime } from '@/lib/format';

interface Props {
  sshId: string;
  myOrgId: string;
  onClose: () => void;
}

export function SshDetailDrawer({ sshId, onClose }: Props) {
  const detail = useSshDetail(sshId);
  const d = detail.data;

  return (
    <Modal
      label="SSH Talebi Detayı"
      backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      panelClassName="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden text-left"
      onClose={onClose}
    >
      {detail.isPending && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {detail.isError && (
        <div className="p-6 text-center text-xs text-rose-600 font-bold">
          SSH talebi detayları yüklenemedi.
        </div>
      )}

      {d && (
        <>
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 flex-shrink-0">
            <h3 className="text-sm font-extrabold text-slate-900">
              SSH Talebi Detayı — <span className="font-mono text-slate-700">{d.sshCode}</span>
            </h3>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-lg font-light cursor-pointer"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
            {/* Top Info Card */}
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">PERAKENDECİ</p>
                <p className="mt-1 font-bold text-slate-800 text-xs">{d.retailerName}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">MÜŞTERİ / ALICI</p>
                <p className="mt-1 font-bold text-slate-800 text-xs">{d.customerName || '—'}</p>
                {d.customerPhone && <p className="text-[11px] font-mono text-slate-500">{d.customerPhone}</p>}
              </div>
            </div>

            {/* Section 1: TALEBE KONU ÜRÜNLER */}
            <div className="space-y-2">
              <p className="font-black text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> TALEBE KONU ÜRÜNLER
              </p>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-2">
                {d.items && d.items.length > 0 ? (
                  d.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1">
                      <span className="font-bold text-slate-800">{item.name}</span>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Talep Edilen Adet</span>
                        <span className="font-bold text-slate-900">{item.quantity} Adet</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">{d.title}</p>
                )}
              </div>
            </div>

            {/* Section 2: TALEP AÇIKLAMASI */}
            <div className="space-y-2">
              <p className="font-black text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> TALEP AÇIKLAMASI
              </p>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 text-slate-700 font-medium whitespace-pre-wrap">
                {d.description || <span className="text-slate-400 italic">Açıklama belirtilmedi.</span>}
              </div>
            </div>

            {/* Section 3: FOTOĞRAFLAR */}
            {d.imageUrls && d.imageUrls.length > 0 && (
              <div className="space-y-2">
                <p className="font-black text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> FOTOĞRAFLAR
                </p>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
                  <PhotoUploader
                    relationshipId={d.relationshipId}
                    sshId={d.id}
                    paths={d.imagePaths}
                    urls={d.imageUrls}
                    disabled={true}
                    onChange={() => {}}
                  />
                </div>
              </div>
            )}

            {/* Section 4: DURUM GEÇMİŞİ VE İŞLEMLER */}
            <div className="space-y-2">
              <p className="font-black text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> DURUM GEÇMİŞİ VE İŞLEMLER
              </p>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
                {d.logs && d.logs.length > 0 ? (
                  d.logs.map((log) => {
                    const statusMeta = SSH_STATUS_META[log.toStatus];
                    return (
                      <div key={log.id} className="flex items-start gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-[11px] text-slate-400">
                              {formatDateTime(log.createdAt)}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${statusMeta.className}`}>
                              {statusMeta.label}
                            </span>
                          </div>
                          {log.note && (
                            <div className="p-2.5 bg-white border border-slate-200/60 rounded-xl text-slate-700 font-medium text-xs mt-1">
                              {log.note}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">Talep Oluşturuldu.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(d.createdAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
