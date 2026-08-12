import { RETAILER_ROLE_COLORS, RETAILER_ROLE_LABELS, type RetailerTeamRole } from '../domain/retailerTeam';

export function RetailerRoleBadge({ role }: { role: RetailerTeamRole }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RETAILER_ROLE_COLORS[role]}`}>
      {RETAILER_ROLE_LABELS[role]}
    </span>
  );
}
