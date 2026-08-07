import { supabase } from './supabase';

const PRODUCT_BUCKET = 'product-images';

/** Ürün başına en fazla görsel. */
export const MAX_PRODUCT_IMAGES = 3;

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_BYTES = 5 * 1024 * 1024;

export type UploadError = 'type' | 'size' | 'failed';

export interface UploadResult {
  url?: string;
  error?: UploadError;
}

/**
 * Ürün görselini yükler ve public URL döner.
 *
 * Yol düzeni `<orgId>/<productId>/<index>_<timestamp>.<ext>` — ilk klasörün org
 * id olması ZORUNLU: Storage RLS sahipliği tam olarak bu parçadan kurar, yani
 * kimse başkasının klasörüne yazamaz.
 *
 * Yeni ürün henüz kaydedilmediği için `productId` yerine geçici bir kimlik
 * verilebilir; görseller kaydetmeden önce yüklenir.
 */
export async function uploadProductImage(
  file: File,
  orgId: string,
  productId: string,
  index: number,
): Promise<UploadResult> {
  if (!ALLOWED.includes(file.type)) return { error: 'type' };
  if (file.size > MAX_BYTES) return { error: 'size' };

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${orgId}/${productId}/${index}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(PRODUCT_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) {
    console.error('[uploadProductImage]', error.message);
    return { error: 'failed' };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path);
  return { url: publicUrl };
}

/**
 * Yüklenmiş bir görseli siler.
 * Public URL'den depolama yolunu geri çıkarır; bucket adından sonrası yoldur.
 */
export async function deleteProductImage(publicUrl: string): Promise<boolean> {
  const marker = `/${PRODUCT_BUCKET}/`;
  const at = publicUrl.indexOf(marker);
  if (at === -1) return false;

  const path = publicUrl.slice(at + marker.length);
  const { error } = await supabase.storage.from(PRODUCT_BUCKET).remove([path]);
  if (error) {
    console.error('[deleteProductImage]', error.message);
    return false;
  }
  return true;
}

export const UPLOAD_ERROR_MESSAGES: Record<UploadError, string> = {
  type: 'Yalnız JPEG, PNG, WebP veya AVIF yükleyebilirsiniz.',
  size: 'Dosya 5 MB sınırını aşıyor.',
  failed: 'Yükleme başarısız oldu. Tekrar deneyin.',
};
