import { SshPanel } from '@/features/service';
import { otherParty, useCounterparties, type Edge } from '@/features/counterparties';
import { useAuthSession } from '@/features/auth';

export default function SshPage() {
  const { data: user } = useAuthSession();
  const orgId = user?.org?.id ?? '';
  const edges: Edge[] = (useCounterparties().data?.pages.flat() ?? []).filter(
    (e) => e.status === 'active' && (e.manufacturerOrgId === orgId || e.retailer.id === orgId),
  );

  if (!user?.org) return null;
  const myKind = user.org.kind;

  const partyOptions: [string, string][] = [
    ...new Map(
      edges.map((e) => {
        const p = otherParty(e, orgId);
        return [p.id, p.companyName] as [string, string];
      }),
    ),
  ];

  return <SshPanel myOrgId={orgId} myKind={myKind} partyOptions={partyOptions} />;
}
