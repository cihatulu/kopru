/**
 * Hazır HTML belgesini yeni pencerede açıp yazdırmaya hazırlar.
 *
 * PDF kütüphanesi YOK: belge kendi içinde bir "Yazdır" düğmesi taşır ve
 * tarayıcının yazdırma penceresini kullanır.
 */
export function openHtmlPrintWindow(html: string): boolean {
  const win = window.open('', '_blank');
  // Açılır pencere engellenmiş olabilir; çağıran kullanıcıyı uyarabilsin.
  if (!win) return false;

  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
