/**
 * Stok yüklemesinde sunucudan dönen hata kodlarını Türkçeye çevirir — SAF.
 *
 * Ham `raise exception` metnini ekrana basmak kullanıcıya hiçbir şey anlatmaz;
 * her kodun yanında NE YAPACAĞI yazılır.
 */
export function stockImportError(err: unknown): string {
  const text =
    err && typeof err === 'object'
      ? [
          (err as { message?: unknown }).message,
          (err as { details?: unknown }).details,
          (err as { hint?: unknown }).hint,
        ]
          .filter((v): v is string => typeof v === 'string')
          .join(' ')
      : typeof err === 'string'
        ? err
        : '';

  if (text.includes('MANUFACTURER_REQUIRED')) {
    return 'Dosyada yeni ürün olarak açılacak satırlar var. Bunların hangi üreticinin kataloğuna yazılacağını seçmeniz gerekiyor.';
  }
  if (text.includes('CATALOG_NOT_ALLOWED')) {
    return 'Seçtiğiniz üreticinin kataloğunu düzenleme izniniz yok. Tedarikçilerim ekranından o üreticinin ürün yönetimi anahtarını kapatın.';
  }
  if (text.includes('STOCK_NOT_ALLOWED')) {
    return 'Stok tutma yetkiniz yok. Misafir hesaplar yalnız tedarikçisinin stoğunu görebilir.';
  }
  if (text.includes('FORBIDDEN')) {
    return 'Bu işlem için yetkiniz yok.';
  }
  if (text.includes('INVALID_PAYLOAD')) {
    return 'Dosya okunamadı; şablonu yeniden indirip deneyin.';
  }
  return 'Yükleme sırasında bir hata oluştu. Dosyayı kontrol edip tekrar deneyin.';
}
