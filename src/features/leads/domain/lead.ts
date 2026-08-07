/** Aday (lead) mantığı — SAF (A20). */

export type LeadStatus = 'new' | 'contacted' | 'interested' | 'converted' | 'rejected';

export const LEAD_STATUS_META: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: 'Yeni', className: 'bg-blue-50 text-blue-700' },
  contacted: { label: 'Arandı', className: 'bg-amber-50 text-amber-700' },
  interested: { label: 'İlgileniyor', className: 'bg-indigo-50 text-indigo-700' },
  converted: { label: 'Müşteri oldu', className: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Olumsuz', className: 'bg-slate-100 text-slate-600' },
};

/** Takip zincirinde bir sonraki adım. */
const FLOW: Partial<Record<LeadStatus, LeadStatus>> = {
  new: 'contacted',
  contacted: 'interested',
};

export function nextLeadStatus(status: LeadStatus): LeadStatus | null {
  return FLOW[status] ?? null;
}

/**
 * `converted` elle işaretlenmez: aday aynı VKN ile sisteme kaydolduğunda
 * veritabanı trigger'ı otomatik dönüştürür. Elle işaretleme, gerçekte kaydolmamış
 * bir adayı müşteri göstererek raporları bozardı.
 */
export function isManuallySettable(status: LeadStatus): boolean {
  return status !== 'converted';
}

export function isClosedLead(status: LeadStatus): boolean {
  return status === 'converted' || status === 'rejected';
}
