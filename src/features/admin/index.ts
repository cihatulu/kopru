// features/admin PUBLIC YÜZEYİ (A20).

export { useOrgList } from './api/useOrgList';
export type { AdminOrg, OrgListFilters } from './api/useOrgList';

export { useCreateOrg } from './api/useCreateOrg';
export type { CreateOrgInput } from './api/useCreateOrg';

export {
  useUpgradeOrg,
  useDowngradeOrg,
  useSetOrgActive,
  useSetRelationshipStatus,
  useDecideSubscriptionRequest,
} from './api/useOrgMutations';
export type { CreateOrgInput, UpgradeInput, UpgradeResult } from './api/useOrgMutations';

export { useRelationshipList, usePendingSubscriptionRequests } from './api/useRelationshipList';
export type { AdminRelationship, AdminSubscriptionRequest } from './api/useRelationshipList';

export {
  suggestSubdomain,
  validateSubdomain,
  normalizeSubdomain,
  SUBDOMAIN_MESSAGES,
} from './domain/subdomain';

export { OrgTable } from './components/OrgTable';
export { OrgToolbar } from './components/OrgToolbar';
export { toSubscriberFilter, SUBSCRIBER_FILTERS } from './domain/filters';
export type { SubscriberFilter } from './domain/filters';
export { UpgradeDialog } from './components/UpgradeDialog';
export { CreateOrgDialog } from './components/CreateOrgDialog';
export { createOrgSchema } from './domain/orgSchema';
export type { CreateOrgForm } from './domain/orgSchema';
export { SubscriberBadge, ActiveBadge, RelationshipBadge } from './components/StatusBadges';
