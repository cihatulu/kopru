import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  MAX_SERVICE_PHOTOS,
  PHOTO_ERROR_MESSAGES,
  deleteServicePhoto,
  uploadServicePhoto,
} from '@/lib/servicePhotos';

interface Props {
  relationshipId: string;
  sshId: string;
  /** Depolama yolları — kalıcı kimlik. */
  paths: string[];
  /** `paths` ile AYNI sıradaki imzalı görüntüleme URL'leri. */
  urls: string[];
  disabled: boolean;
  onChange: (paths: string[]) => void;
}

/**
 * Servis fotoğrafları.
 *
 * Yol listesi ile URL listesi ayrı taşınır: URL'ler imzalıdır ve kısa sürede
 * ölür, yol ise kalıcıdır. Silme işlemi HER ZAMAN yol üzerinden yapılır —
 * süresi dolmuş bir URL'den yol çıkarmaya çalışmak kırılgan olurdu.
 */
export function PhotoUploader({ relationshipId, sshId, paths, urls, disabled, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const full = paths.length >= MAX_SERVICE_PHOTOS;

  const pick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);

    const room = MAX_SERVICE_PHOTOS - paths.length;
    const added: string[] = [];

    for (const file of Array.from(files).slice(0, room)) {
      const result = await uploadServicePhoto(file, relationshipId, sshId);
      if (result.error) {
        setError(PHOTO_ERROR_MESSAGES[result.error]);
        break;
      }
      if (result.path) added.push(result.path);
    }

    // Kısmen yüklenmiş olsa da eldekini kaydet — kullanıcı baştan başlamasın.
    if (added.length > 0) onChange([...paths, ...added]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = async (path: string) => {
    setBusy(true);
    await deleteServicePhoto(path);
    onChange(paths.filter((p) => p !== path));
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {paths.map((path, i) => (
          <div key={path} className="relative">
            <img
              src={urls[i] || undefined}
              alt="Servis fotoğrafı"
              className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200"
            />
            {!disabled && (
              <button
                type="button"
                aria-label="Fotoğrafı sil"
                onClick={() => void remove(path)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-xs text-white"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {paths.length === 0 && <p className="text-sm text-slate-500">Henüz fotoğraf eklenmedi.</p>}
      </div>

      {!disabled && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => void pick(e.target.files)}
          />
          <Button
            variant="secondary"
            loading={busy}
            disabled={full}
            onClick={() => inputRef.current?.click()}
          >
            {full ? `En fazla ${MAX_SERVICE_PHOTOS} fotoğraf` : 'Fotoğraf ekle'}
          </Button>
        </>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
