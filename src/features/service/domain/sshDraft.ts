/** SSH talebi taslağının kuralları — SAF (A20). */

/** Bir siparişten en fazla bu kadar SSH talebi açılabilir. */
export const MAX_SSH_PER_ORDER = 2;

export interface SshOrderSummary {
  orderNo: string;
  /** Henüz sonuçlanmamış (tamamlanmamış/iptal edilmemiş) talep sayısı. */
  openSshCount: number;
  totalSshCount: number;
}

export interface SshItemSelection {
  id: string;
  productId: string;
  name: string;
  maxQty: number;
  qty: number;
  selected: boolean;
}

/**
 * Siparişten yeni talep açılamamasının sebebi; açılabiliyorsa null.
 *
 * İki kural birlikte çalışır: açık bir talep varken ikincisi açılamaz (aynı
 * arıza iki kayda bölünmesin), ve sipariş başına toplam sınır aşılamaz.
 * Sıralama önemli: açık talep varsa kullanıcıya limit değil o söylenir.
 */
export function sshBlockReason(o: SshOrderSummary): string | null {
  if (o.openSshCount > 0) {
    return `Sipariş #${o.orderNo} için henüz sonuçlanmamış aktif bir SSH kaydı bulunmaktadır. Yeni talep açmadan önce mevcut talebin sonuçlanması gerekir.`;
  }
  if (o.totalSshCount >= MAX_SSH_PER_ORDER) {
    return `Sipariş #${o.orderNo} için maksimum SSH talebi sınırına (${MAX_SSH_PER_ORDER} adet) ulaşıldı.`;
  }
  return null;
}

export interface SshDraft {
  order: SshOrderSummary | null;
  items: SshItemSelection[];
  customProductName: string;
  description: string;
}

/** İlk hatayı döndürür; taslak geçerliyse null. */
export function validateSshDraft(d: SshDraft): string | null {
  const selected = d.items.filter((i) => i.selected);

  if (d.order && d.items.length > 0 && selected.length === 0) {
    return 'Lütfen en az bir problemli ürün seçiniz.';
  }
  if (!d.order && !d.customProductName.trim()) {
    return 'Lütfen ürün adı veya bilgisi giriniz.';
  }
  if (!d.description.trim()) {
    return 'Lütfen arıza / sorun detayını açıklayınız.';
  }
  return null;
}

export const MAX_SSH_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Fotoğrafın neden kabul edilmediği; kabul ediliyorsa null. */
export function photoRejectReason(file: { type: string; size: number }): string | null {
  if (!PHOTO_TYPES.includes(file.type)) {
    return 'Yalnız JPEG, PNG veya WebP fotoğrafları yükleyebilirsiniz.';
  }
  if (file.size > MAX_PHOTO_BYTES) return 'Fotoğraf boyutu 5 MB sınırını aşamaz.';
  return null;
}

/** Başlık kullanıcıdan istenmez; seçimden türetilir. */
export function sshTitle(d: SshDraft): string {
  const selected = d.items.filter((i) => i.selected);
  const first = selected[0];

  if (first) {
    const extra = selected.length > 1 ? ` (+${selected.length - 1} ürün)` : '';
    return `${first.name}${extra} SSH Talebi`;
  }
  if (d.customProductName.trim()) return `${d.customProductName.trim()} SSH Talebi`;
  if (d.order) return `Sipariş #${d.order.orderNo} SSH Talebi`;
  return 'Genel Servis / SSH Talebi';
}
