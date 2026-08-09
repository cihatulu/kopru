import { CustomerManager } from '@/features/counterparties';
import { InvitationsPanel } from '@/features/invitations';
import { useAuthSession } from '@/features/auth';

/** Müşteri Yönetimi — YALNIZ KOMPOZİSYON (A20). */
export default function CustomersPage() {
  const { data: user } = useAuthSession();
  const org = user?.org;
  if (!org) return null;

  return (
    <div className="space-y-8">
      <CustomerManager myOrgId={org.id} myKind={org.kind} myVknTc={org.vknTc} />

      {/* Davetler: müşteri eklemenin ikinci yolu — karşı taraf kendi açar. */}
      {org.isSubscriber && <InvitationsPanel myKind={org.kind} />}
    </div>
  );
}
