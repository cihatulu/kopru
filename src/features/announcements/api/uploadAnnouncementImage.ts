import { supabase } from '@/lib/supabase';

const BUCKET = 'announcement-images';

/**
 * Duyuru görselini yükler ve okunabilir URL'ini döner.
 *
 * Yol her zaman `<ownerOrgId>/<dosya>` biçimindedir — Storage RLS politikası
 * ilk klasör adının çağıranın org kimliği olmasına bakar. Bu kural burada, tek
 * yerde uygulanır; component'e bırakılırsa bir sonraki çağrı yerinde unutulur.
 *
 * Hata mesajı sunucudan geldiği gibi taşınır; yutulmaz.
 */
export async function uploadAnnouncementImage(
  ownerOrgId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${ext}`;
  const filePath = `${ownerOrgId}/${fileName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(filePath, file);
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  return publicUrl;
}
