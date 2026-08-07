import { useRef, useState } from 'react';
import {
  MAX_PRODUCT_IMAGES,
  UPLOAD_ERROR_MESSAGES,
  deleteProductImage,
  uploadProductImage,
} from '@/lib/storage';

interface Props {
  orgId: string;
  /** Yeni üründe geçici kimlik; kaydetmeden önce yükleme yapılabilsin diye. */
  productId: string;
  images: string[];
  onChange: (images: string[]) => void;
}

/**
 * Ürün görselleri — en fazla 3 adet.
 *
 * Görseller kaydetmeden ÖNCE yüklenir; ürün formunun kaydı yalnız URL listesini
 * taşır. Böylece kaydetme sırasında büyük dosya beklenmez ve kayıt başarısız
 * olursa görseller kaybolmaz.
 */
export function ImageUploader({ orgId, productId, images, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_PRODUCT_IMAGES - images.length;

  const handleFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    setBusy(true);

    const files = Array.from(list).slice(0, remaining);
    const uploaded: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const result = await uploadProductImage(files[i]!, orgId, productId, images.length + i);
      if (result.url) uploaded.push(result.url);
      // İlk hatada durmayıp kalanları denemek yerine hatayı gösteriyoruz:
      // sessizce eksik yüklemek, kullanıcının fark etmediği bir kayıptır.
      else if (result.error) setError(UPLOAD_ERROR_MESSAGES[result.error]);
    }

    if (uploaded.length) onChange([...images, ...uploaded]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  // Bilinçli olarak beklenmiyor: görsel listeden hemen kalkar, depolama silme
  // arka planda gider. Yetim bir dosya bırakmak, kullanıcıyı bekletmekten iyidir.
  const remove = (url: string) => {
    onChange(images.filter((u) => u !== url));
    void deleteProductImage(url);
  };

  return (
    <div>
      <label className="label">Ürün görselleri</label>

      {images.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {images.map((url) => (
            <li key={url} className="relative">
              <img
                src={url}
                alt=""
                className="size-20 rounded-lg border border-slate-200 object-cover"
              />
              <button
                type="button"
                aria-label="Görseli kaldır"
                onClick={() => remove(url)}
                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-slate-900 text-xs text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <div className="rounded-lg border-2 border-dashed border-slate-300 px-4 py-5 text-center">
          <input
            ref={inputRef}
            id="product-images"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            className="sr-only"
            disabled={busy}
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <label
            htmlFor="product-images"
            className="cursor-pointer text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            {busy ? 'Yükleniyor…' : 'Fotoğraf seç'}
          </label>
          <p className="mt-1 text-xs text-slate-400">
            {remaining} fotoğraf daha ekleyebilirsiniz · JPEG, PNG, WebP · en fazla 5 MB
          </p>
        </div>
      )}

      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
