import type { Plan, RelationshipStatus } from '@/constants';

const BASE = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';

/**
 * Abone / misafir ayrımı. Misafir "eksik" bir kayıt değil — grafın tam üyesi,
 * yalnız bizden hizmet almıyor. Rozet bunu olumsuzlamadan anlatmalı.
 */
export function SubscriberBadge({
  isSubscriber,
  plan,
}: {
  isSubscriber: boolean;
  plan: Plan | null;
}) {
  if (!isSubscriber) {
    return <span className={`${BASE} bg-slate-100 text-slate-600`}>Misafir</span>;
  }
  return (
    <span className={`${BASE} bg-emerald-50 text-emerald-700`}>
      Abone{plan ? ` · ${plan}` : ''}
    </span>
  );
}

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className={`${BASE} bg-blue-50 text-blue-700`}>Aktif</span>
  ) : (
    <span className={`${BASE} bg-amber-50 text-amber-700`}>Pasif</span>
  );
}

const RELATIONSHIP_LABELS: Record<RelationshipStatus, { text: string; cls: string }> = {
  pending: { text: 'Onay bekliyor', cls: 'bg-amber-50 text-amber-700' },
  active: { text: 'Aktif', cls: 'bg-emerald-50 text-emerald-700' },
  passive: { text: 'Pasif', cls: 'bg-slate-100 text-slate-600' },
};

export function RelationshipBadge({ status }: { status: RelationshipStatus }) {
  const meta = RELATIONSHIP_LABELS[status];
  return <span className={`${BASE} ${meta.cls}`}>{meta.text}</span>;
}
