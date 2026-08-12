import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ORDER_STATUS_META, type OrderStatus } from '../domain/status';

interface Props {
  currentStatus: OrderStatus;
  targetStatus: OrderStatus;
  note: string;
  pending: boolean;
  onNoteChange: (note: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

/** Durum değişikliği onayı ve isteğe bağlı not — iptal de bu pencereden geçer. */
export function StatusUpdateDialog({
  currentStatus,
  targetStatus,
  note,
  pending,
  onNoteChange,
  onClose,
  onConfirm,
}: Props) {
  return (
    <Modal
      label="Durum Güncelleme ve Not"
      panelClassName="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-0 shadow-2xl border border-slate-100 overflow-hidden"
      onClose={onClose}
      closeDisabled={pending}
    >
      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/60">
        <h3 className="text-base font-bold text-slate-900">Durum Güncelleme ve Not</h3>
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-lg font-medium cursor-pointer"
        >
          &times;
        </button>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="flex-1 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Eski Durum
            </span>
            <span className="font-semibold text-sm text-slate-700">
              {ORDER_STATUS_META[currentStatus].label}
            </span>
          </div>
          <div className="flex-shrink-0 text-slate-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
          <div className="flex-1 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Yeni Durum
            </span>
            <span className="font-semibold text-sm text-indigo-600">
              {ORDER_STATUS_META[targetStatus].label}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            Açıklama / Not <span className="font-normal normal-case text-slate-400">(Opsiyonel)</span>
          </label>
          <textarea
            className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none transition-all outline-none min-h-[100px]"
            rows={4}
            placeholder="Durum değişikliği notu..."
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50/60 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
        >
          İptal
        </button>
        <Button
          loading={pending}
          onClick={onConfirm}
          className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm cursor-pointer"
        >
          Onayla ve Güncelle
        </Button>
      </div>
    </Modal>
  );
}
