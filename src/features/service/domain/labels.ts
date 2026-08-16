/** SSH ve iade durum etiketleri — SAF (A20). */
import type { ReturnStatus, SshStatus } from '../api/shared';

interface Meta {
  label: string;
  className: string;
}

export const SSH_STATUS_META: Record<SshStatus, Meta> = {
  bekliyor: { label: 'Bekliyor', className: 'bg-amber-50 text-amber-700' },
  inceleniyor: { label: 'İnceleniyor', className: 'bg-blue-50 text-blue-700' },
  parca_gonderildi: { label: 'Parça gönderildi', className: 'bg-cyan-50 text-cyan-700' },
  tamamlandi: { label: 'Tamamlandı', className: 'bg-emerald-50 text-emerald-700' },
  iptal: { label: 'İptal', className: 'bg-slate-100 text-slate-600' },
};

export const RETURN_STATUS_META: Record<ReturnStatus, Meta> = {
  pending: { label: 'Karar bekliyor', className: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Onaylandı', className: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Reddedildi', className: 'bg-red-50 text-red-700' },
};

/** Üreticinin SSH akışında ilerletebileceği bir sonraki adım. */
const SSH_FLOW: Partial<Record<SshStatus, SshStatus>> = {
  bekliyor: 'inceleniyor',
  inceleniyor: 'parca_gonderildi',
  parca_gonderildi: 'tamamlandi',
};

export function nextSshStatus(status: SshStatus): SshStatus | null {
  return SSH_FLOW[status] ?? null;
}

export function isSshClosed(status: SshStatus): boolean {
  return status === 'tamamlandi' || status === 'iptal';
}
