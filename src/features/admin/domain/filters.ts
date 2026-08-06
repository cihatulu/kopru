/**
 * Liste filtresi eşlemesi — SAF (A20).
 * Component dosyasında durduğunda hem react-refresh bozuluyor hem de saf mantık
 * sunum katmanına sızıyordu.
 */

export type SubscriberFilter = 'all' | 'subscriber' | 'guest';

export const SUBSCRIBER_FILTERS: { id: SubscriberFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'subscriber', label: 'Abone' },
  { id: 'guest', label: 'Misafir' },
];

/** Araç çubuğu seçimini sorgu filtresine çevirir. */
export function toSubscriberFilter(value: SubscriberFilter): { isSubscriber?: boolean } {
  if (value === 'subscriber') return { isSubscriber: true };
  if (value === 'guest') return { isSubscriber: false };
  return {};
}
