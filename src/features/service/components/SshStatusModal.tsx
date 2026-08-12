import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SSH_STATUS_META } from '../domain/labels';
import type { SshStatus } from '../api/shared';
import type { SshRequest } from '../api/useSshRequests';

interface Props {
  request: SshRequest;
  isPending?: boolean;
  onClose: () => void;
  onSubmit: (status: SshStatus, note?: string) => void;
}

const STATUS_LIST: SshStatus[] = ['inceleniyor', 'bekliyor', 'parca_gonderildi', 'tamamlandi'];

export function SshStatusModal({ request, isPending, onClose, onSubmit }: Props) {
  const [newStatus, setNewStatus] = useState<SshStatus>(request.status);
  const [note, setNote] = useState('');

  const currentMeta = SSH_STATUS_META[request.status];
  const targetMeta = SSH_STATUS_META[newStatus];

  const handleSubmit = () => {
    onSubmit(newStatus, note.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden text-left">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Durum Güncelle</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-lg font-light cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* Status Arrow Flow Badge */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-center gap-3">
            <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold ${currentMeta.className}`}>
              {currentMeta.label}
            </span>
            <span className="text-slate-400 font-bold">→</span>
            <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold ${targetMeta.className}`}>
              {targetMeta.label}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
              YENİ DURUM
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as SshStatus)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none cursor-pointer"
            >
              {STATUS_LIST.map((st) => (
                <option key={st} value={st}>
                  {SSH_STATUS_META[st].label}
                </option>
              ))}
              <option value="iptal">İptal</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
              AÇIKLAMA / NOT (İSTEĞE BAĞLI)
            </label>
            <textarea
              rows={3}
              placeholder="Yapılan işlem veya parça durum kargo takip no vb..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            İptal
          </Button>
          <Button
            loading={isPending}
            onClick={handleSubmit}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
          >
            Durumu Güncelle
          </Button>
        </div>
      </div>
    </div>
  );
}
