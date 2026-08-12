import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import type { Announcement } from '../api/useAnnouncements';

interface Props {
  announcement?: Announcement | null;
  customers: { id: string; name: string }[];
  ownerOrgId: string;
  pending: boolean;
  onClose: () => void;
  onSubmit: (v: { title: string; body: string; targetRetailerOrgId?: string | null; imageUrl?: string | null }) => void;
}

export function AnnouncementDialog({ announcement, customers, ownerOrgId, pending, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState(announcement?.title ?? '');
  const [body, setBody] = useState(announcement?.body ?? '');
  const [targetRetailerOrgId, setTargetRetailerOrgId] = useState(announcement?.targetRetailerOrgId ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(announcement?.imageUrl ?? '');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !body.trim()) {
      setError('Başlık ve içerik alanları zorunludur.');
      return;
    }

    setIsUploading(true);
    setError(null);
    let finalImageUrl = previewUrl;

    try {
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        // KÖPRÜ RLS KURALI: İlk klasör adı ownerOrgId olmak zorunda!
        const filePath = `${ownerOrgId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('announcement-images')
          .upload(filePath, imageFile);

        if (uploadError) {
          setError('Görsel yüklenirken hata oluştu: ' + uploadError.message);
          setIsUploading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('announcement-images')
          .getPublicUrl(filePath);

        finalImageUrl = publicUrl;
      }

      onSubmit({
        title: title.trim(),
        body: body.trim(),
        targetRetailerOrgId: targetRetailerOrgId || null,
        imageUrl: finalImageUrl || null,
      });
    } catch (err) {
      setError('İşlem sırasında beklenmedik bir hata oluştu.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      label={announcement ? 'Duyuruyu Düzenle' : 'Yeni Duyuru Yayınla'}
      panelClassName="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-100/80 text-left"
      onClose={onClose}
      closeDisabled={pending || isUploading}
    >
      <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-6">
        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
        <h3 className="text-sm font-bold text-slate-800">
          {announcement ? 'Duyuruyu Düzenle' : 'Yeni Duyuru Yayınla'}
        </h3>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="bg-red-50 text-red-600 p-3.5 rounded-xl text-xs font-semibold border border-red-100 shadow-sm animate-pulse">
            {error}
          </div>
        )}

        {/* Hedef Kitle */}
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
            Hedef Kitle
          </label>
          <select
            value={targetRetailerOrgId}
            disabled={pending || isUploading}
            onChange={(e) => setTargetRetailerOrgId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl text-xs py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all bg-slate-50/50 focus:bg-white text-slate-800 font-semibold"
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

        {/* Duyuru Başlığı */}
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
            Duyuru Başlığı *
          </label>
          <input
            type="text"
            value={title}
            disabled={pending || isUploading}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-slate-200 rounded-xl text-xs py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all bg-slate-50/50 focus:bg-white text-slate-800 font-medium"
            required
          />
        </div>

        {/* Görsel Yükleme */}
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
            Görsel (İsteğe Bağlı)
          </label>
          <input
            type="file"
            accept="image/*"
            disabled={pending || isUploading}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setImageFile(e.target.files[0]);
                setPreviewUrl(URL.createObjectURL(e.target.files[0]));
              }
            }}
            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-3.5 file:rounded-xl file:border file:border-slate-200 file:text-xs file:font-bold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer focus:outline-none"
          />
          {previewUrl && (
            <div className="mt-3 relative inline-block rounded-xl border border-slate-100 overflow-hidden shadow-sm">
              <img src={previewUrl} alt="Preview" className="h-24 w-auto object-cover" />
              <button
                type="button"
                disabled={pending || isUploading}
                onClick={() => {
                  setImageFile(null);
                  setPreviewUrl('');
                }}
                className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-sm transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Duyuru İçeriği */}
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
            Duyuru İçeriği *
          </label>
          <textarea
            value={body}
            disabled={pending || isUploading}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className="w-full border border-slate-200 rounded-xl p-3.5 text-xs focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all resize-none bg-slate-50/50 focus:bg-white text-slate-800 font-medium"
            required
          />
        </div>

        {/* Footer Butonları */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
          <Button
            type="button"
            variant="secondary"
            disabled={pending || isUploading}
            onClick={onClose}
          >
            İptal
          </Button>
          <Button
            type="submit"
            loading={pending || isUploading}
            disabled={pending || isUploading}
          >
            {isUploading ? 'Görsel Yükleniyor...' : announcement ? 'Kaydet' : 'Yayınla'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
