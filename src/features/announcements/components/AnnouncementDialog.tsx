import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { errorMessage } from '@/lib/errorMessage';
import { uploadAnnouncementImage } from '../api/uploadAnnouncementImage';
import { AnnouncementImageField } from './AnnouncementImageField';
import type { Announcement } from '../api/useAnnouncements';

interface Props {
  announcement?: Announcement | null;
  customers: { id: string; name: string }[];
  ownerOrgId: string;
  pending: boolean;
  onClose: () => void;
  onSubmit: (v: { title: string; body: string; targetRetailerOrgId?: string | null; imageUrl?: string | null }) => void;
}

const FIELD =
  'w-full border border-slate-200 rounded-xl text-xs py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all bg-slate-50/50 focus:bg-white text-slate-800 font-medium';
const LABEL = 'block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5';

export function AnnouncementDialog({ announcement, customers, ownerOrgId, pending, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState(announcement?.title ?? '');
  const [body, setBody] = useState(announcement?.body ?? '');
  const [targetRetailerOrgId, setTargetRetailerOrgId] = useState(announcement?.targetRetailerOrgId ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(announcement?.imageUrl ?? '');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = pending || isUploading;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !body.trim()) {
      setError('Başlık ve içerik alanları zorunludur.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const imageUrl = imageFile ? await uploadAnnouncementImage(ownerOrgId, imageFile) : previewUrl;
      onSubmit({
        title: title.trim(),
        body: body.trim(),
        targetRetailerOrgId: targetRetailerOrgId || null,
        imageUrl: imageUrl || null,
      });
    } catch (err) {
      setError(errorMessage(err, 'İşlem sırasında beklenmedik bir hata oluştu.'));
    } finally {
      setIsUploading(false);
    }
  };

  const heading = announcement ? 'Duyuruyu Düzenle' : 'Yeni Duyuru Yayınla';

  return (
    <Modal
      label={heading}
      panelClassName="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-100/80 text-left"
      onClose={onClose}
      closeDisabled={busy}
    >
      <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-6">
        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
        <h3 className="text-sm font-bold text-slate-800">{heading}</h3>
      </div>

      <form onSubmit={(e) => void handleFormSubmit(e)} className="space-y-4">
        {error && (
          <div role="alert" className="bg-red-50 text-red-600 p-3.5 rounded-xl text-xs font-semibold border border-red-100 shadow-sm">
            {error}
          </div>
        )}

        <div>
          <label className={LABEL} htmlFor="ann-target">Hedef Kitle</label>
          <select
            id="ann-target"
            value={targetRetailerOrgId}
            disabled={busy}
            onChange={(e) => setTargetRetailerOrgId(e.target.value)}
            className={`${FIELD} font-semibold`}
          >
            <option value="">Tüm Perakendeciler (Genel)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-[9px] text-slate-400 mt-1.5 font-bold italic">
            Boş bırakırsanız duyuru tüm müşterilerinize gönderilir.
          </p>
        </div>

        <div>
          <label className={LABEL} htmlFor="ann-title">Duyuru Başlığı *</label>
          <input
            id="ann-title"
            type="text"
            value={title}
            disabled={busy}
            onChange={(e) => setTitle(e.target.value)}
            className={FIELD}
            required
          />
        </div>

        <AnnouncementImageField
          previewUrl={previewUrl}
          disabled={busy}
          onPick={(file) => {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
          }}
          onClear={() => {
            setImageFile(null);
            setPreviewUrl('');
          }}
        />

        <div>
          <label className={LABEL} htmlFor="ann-body">Duyuru İçeriği *</label>
          <textarea
            id="ann-body"
            value={body}
            disabled={busy}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className={`${FIELD} resize-none p-3.5`}
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" loading={busy} disabled={busy}>
            {isUploading ? 'Görsel Yükleniyor...' : announcement ? 'Kaydet' : 'Yayınla'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
