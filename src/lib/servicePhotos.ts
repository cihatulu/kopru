import { supabase } from './supabase';

const BUCKET = 'service-photos';

/** Servis talebi başına en fazla fotoğraf — sunucu da aynı sınırı uygular. */
export const MAX_SERVICE_PHOTOS = 10;

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

/** İmzalı URL ömrü. Kısa tutulur: bağlantı paylaşılırsa hızla ölsün. */
const SIGN_TTL_SECONDS = 60 * 10;

export type PhotoUploadError = 'type' | 'size' | 'failed';

export const PHOTO_ERROR_MESSAGES: Record<PhotoUploadError, string> = {
  type: 'Yalnız JPEG, PNG veya WebP yükleyebilirsiniz.',
  size: 'Dosya 5 MB sınırını aşıyor.',
  failed: 'Yükleme başarısız oldu. Tekrar deneyin.',
};

export interface PhotoUploadResult {
  /** Depolama YOLU — public URL değil; bucket private. */
  path?: string;
  error?: PhotoUploadError;
}

/**
 * Servis fotoğrafı yükler ve depolama yolunu döner.
 *
 * Yol düzeni `<relationshipId>/<sshId>/<zaman>_<rastgele>.<uzantı>` — ilk
 * klasörün ilişki kimliği olması ZORUNLU: Storage RLS erişimi tam olarak bu
 * parçadan `is_my_relationship()` ile kurar. İkinci taraf da (üretici) aynı
 * fotoğrafı görebilmeli; sahiplik org değil İLİŞKİ düzeyindedir.
 *
 * Ürün görsellerinden farklı olarak public URL DÖNMEZ: bucket private, çünkü
 * servis fotoğrafı çoğu zaman son müşterinin evini gösterir.
 */
export async function uploadServicePhoto(
  file: File,
  relationshipId: string,
  sshId: string,
): Promise<PhotoUploadResult> {
  if (!ALLOWED.includes(file.type)) return { error: 'type' };
  if (file.size > MAX_BYTES) return { error: 'size' };

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const unique = Math.random().toString(36).slice(2, 8);
  const path = `${relationshipId}/${sshId}/${Date.now()}_${unique}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error('[uploadServicePhoto]', error.message);
    return { error: 'failed' };
  }
  return { path };
}

/**
 * Yolları görüntülenebilir imzalı URL'lere çevirir.
 *
 * Sırayı KORUR ve imzalanamayan yol için boş dize döner — dizi indeksleri
 * kaydırsaydı silme işlemi yanlış fotoğrafı hedeflerdi.
 */
export async function signServicePhotos(paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGN_TTL_SECONDS);

  if (error || !data) {
    console.error('[signServicePhotos]', error?.message);
    return paths.map(() => '');
  }

  const byPath = new Map(data.map((d) => [d.path ?? '', d.signedUrl ?? '']));
  return paths.map((p) => byPath.get(p) ?? '');
}

/** Depolamadaki fotoğrafı siler. Kayıttaki yol listesi ayrıca güncellenmeli. */
export async function deleteServicePhoto(path: string): Promise<boolean> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    console.error('[deleteServicePhoto]', error.message);
    return false;
  }
  return true;
}
