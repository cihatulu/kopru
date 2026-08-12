/** Perakendeci ekip yönetiminin saf domain katmanı. */

export type RetailerTeamRole = 'retailer_staff' | 'retailer_accountant';

export const RETAILER_TEAM_ROLES: readonly RetailerTeamRole[] = [
  'retailer_staff',
  'retailer_accountant',
] as const;

export const RETAILER_ROLE_LABELS: Record<RetailerTeamRole, string> = {
  retailer_staff: 'Satış Personeli',
  retailer_accountant: 'Muhasebe Personeli',
};

export const RETAILER_ROLE_COLORS: Record<RetailerTeamRole, string> = {
  retailer_staff: 'bg-blue-100 text-blue-700',
  retailer_accountant: 'bg-purple-100 text-purple-700',
};

export function isRetailerTeamRole(v: unknown): v is RetailerTeamRole {
  return (
    typeof v === 'string' &&
    (RETAILER_TEAM_ROLES as readonly string[]).includes(v)
  );
}

export function isInvitationExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}
