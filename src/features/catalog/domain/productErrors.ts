/**
 * Sunucu hatalarının Türkçe karşılığı.
 *
 * Tek bir "Kaydedilemedi" mesajı kullanıcıyı kör bırakıyordu: ürün kodu
 * çakıştığında 409 dönüyor ama ekranda sebebi yazmıyordu, kullanıcı da
 * "kaydetmiyor" demekten başka bir şey söyleyemiyordu.
 */
const SAVE_MESSAGES: Record<string, string> = {
  // unique (owner_org_id, code) ihlali
  '23505': 'Bu ürün kodu (model) zaten kullanılıyor. Farklı bir kod girin.',
  NAME_AND_CODE_REQUIRED: 'Ürün adı ve ürün kodu zorunludur.',
  INVALID_PRICE: 'Satış fiyatı geçersiz; negatif olamaz.',
  GROUP_NOT_FOUND: 'Seçilen grup bulunamadı.',
  SET_ITEM_NOT_FOUND: 'Takım içeriğindeki ürünlerden biri size ait değil.',
  PRODUCT_NOT_FOUND: 'Ürün bulunamadı; başka biri silmiş olabilir.',
  PRODUCT_IS_ACTIVE: 'Aktif ürün kalıcı olarak silinemez; önce pasife alın.',
  PRODUCT_IN_SET: 'Bu ürün bir takımın içinde; önce takımdan çıkarın.',
  FORBIDDEN: 'Bu işlem için yetkiniz yok.',
  DEFAULT: 'Kaydedilemedi. Bilgileri kontrol edin.',
};

export class ProductError extends Error {
  constructor(public readonly code: string) {
    super(SAVE_MESSAGES[code] ?? SAVE_MESSAGES.DEFAULT!);
    this.name = 'ProductError';
  }
}

/** PostgREST hatasını okunur bir mesaja çevirir. */
export function toProductError(error: { code?: string; message?: string }): ProductError {
  // Kısıt ihlallerinde kod (23505), RAISE EXCEPTION'larda mesaj anlamlıdır.
  if (error.code && SAVE_MESSAGES[error.code]) return new ProductError(error.code);
  if (error.message && SAVE_MESSAGES[error.message]) return new ProductError(error.message);
  return new ProductError('DEFAULT');
}
