// features/retailer-team PUBLIC YÜZEYİ (A20).
//
// Perakendecinin kendi personeli (staff / accountant). Üreticinin `team`
// feature'ının perakendeci karşılığıdır; roller ayrı isimlendirilir çünkü
// perakendeci personeli üretici kataloğuna değil kendi cari/siparişine bakar.

export { useRetailerTeamMembers, useRetailerInvitations } from './api/useRetailerTeam';
export {
  useAddRetailerMember,
  useToggleRetailerMemberStatus,
  useUpdateRetailerMemberRole,
  useUpdateRetailerMemberPassword,
} from './api/useRetailerTeamMutations';
export type { RetailerTeamMember, RetailerInvitation } from './api/model';

export {
  RETAILER_TEAM_ROLES,
  RETAILER_ROLE_LABELS,
  RETAILER_ROLE_COLORS,
  isRetailerTeamRole,
  isInvitationExpired,
} from './domain/retailerTeam';
export type { RetailerTeamRole } from './domain/retailerTeam';

export { RetailerRoleBadge } from './components/RetailerRoleBadge';
export { AddRetailerMemberModal } from './components/AddRetailerMemberModal';
export { EditRetailerMemberModal } from './components/EditRetailerMemberModal';
export { InviteRetailerMemberModal } from './components/InviteRetailerMemberModal';
