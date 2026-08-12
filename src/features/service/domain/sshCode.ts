/**
 * SSH takip kodu: `SSH-YYYYAAGG-XXXX`.
 *
 * Kullanıcının telefonda okuyabileceği kısa bir kimlik; UUID'nin kendisi bu iş
 * için okunamaz. Tarih kısmı kaydın açılış gününden gelir — eksikse sıfırlanır,
 * uydurma bir tarih yazılmaz.
 */
export function sshCode(id: string, createdAt: string): string {
  if (!id) return 'SSH-0000';
  const datePart = (createdAt.split('T')[0] ?? '').replace(/-/g, '');
  return `SSH-${datePart || '00000000'}-${id.slice(0, 4).toUpperCase()}`;
}
