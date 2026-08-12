import { isRetailerTeamRole, type RetailerTeamRole } from '../domain/retailerTeam';

export interface RetailerTeamMember {
  id: string;
  orgId: string;
  userId: string;
  role: RetailerTeamRole;
  isActive: boolean;
  email: string | null;
  createdAt: string;
}

export interface RetailerInvitation {
  id: string;
  orgId: string;
  email: string;
  role: RetailerTeamRole;
  token: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export function mapRetailerTeamMember(row: Record<string, unknown>): RetailerTeamMember {
  const roleStr = str(row.org_role);
  const mappedRole = roleStr === 'accountant' ? 'retailer_accountant' : 'retailer_staff';
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    userId: str(row.id),
    role: mappedRole,
    isActive: Boolean(row.is_active),
    email: strNull(row.email),
    createdAt: str(row.created_at),
  };
}

export function mapRetailerInvitation(row: Record<string, unknown>): RetailerInvitation {
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    email: str(row.email),
    role: isRetailerTeamRole(row.role) ? row.role : 'retailer_staff',
    token: str(row.token),
    expiresAt: str(row.expires_at),
    usedAt: strNull(row.used_at),
    createdAt: str(row.created_at),
  };
}
