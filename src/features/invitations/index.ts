// features/invitations PUBLIC YÜZEYİ (A20).

export { useInvitations } from './api/useInvitations';
export { useCreateInvitation, useRevokeInvitation } from './api/useInviteMutations';
export type { CreateInviteInput } from './api/useInviteMutations';
export { useInvitePreview, useAcceptInvitation, InviteError } from './api/useInviteAcceptance';
export type { InvitePreview, AcceptResult, AcceptInput } from './api/useInviteAcceptance';

export {
  inviteState,
  isActionable,
  inviteUrl,
  invitedKind,
  inviteNoun,
  daysLeft,
  INVITE_STATE_LABEL,
} from './domain/invitation';
export type { Invitation, InviteState } from './domain/invitation';

export {
  buildInviteMessage,
  toWhatsappNumber,
  whatsappShareUrl,
} from './domain/inviteShare';
export type { InviteShareInput } from './domain/inviteShare';

export { INVITE_ERROR_MESSAGES, isTerminalInviteError } from './domain/inviteErrors';

export { createInviteSchema, acceptInviteSchema, conflictsWithInviter } from './domain/inviteSchema';
export type { CreateInviteForm, AcceptInviteForm } from './domain/inviteSchema';

export { InvitationsPanel } from './components/InvitationsPanel';
export { InviteTable } from './components/InviteTable';
export { InviteDialog } from './components/InviteDialog';
export { AcceptInviteFormView } from './components/AcceptInviteForm';
export { AcceptSuccess } from './components/AcceptSuccess';
export { InviteReadyPanel } from './components/InviteReadyPanel';
