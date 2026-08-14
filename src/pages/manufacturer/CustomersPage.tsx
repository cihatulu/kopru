import { CounterpartyInvitePanel, CustomerManager } from '@/features/counterparties';
import { useAuthSession } from '@/features/auth';

/** Müşteri Yönetimi — YALNIZ KOMPOZİSYON (A20). */
export default function CustomersPage() {
  const { data: user } = useAuthSession();
  const org = user?.org;
  if (!org) return null;

  return (
    <div className="space-y-8">
      <CustomerManager myOrgId={org.id} myKind={org.kind} myVknTc={org.vknTc} />

      {/* Davetler: müşteri eklemenin ikinci yolu. Giriş bilgilerini davet eden
          belirler, link WhatsApp ile gider — perakendecinin Tedarikçilerim
          ekranındaki akışın aynısı, yalnız karşı taraf bayidir. */}
      {org.isSubscriber && <CounterpartyInvitePanel noun="Bayi" />}
    </div>
  );
}
