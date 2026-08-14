// features/counterparties PUBLIC YÜZEYİ (A20).

export { useCounterparties } from './api/useCounterparties';
export { useOrgLookup } from './api/useOrgLookup';
export {
  useCreateCustomer,
  useUpdateCustomer,
  useResetCustomerPassword,
  CustomerError,
} from './api/useCustomerMutations';
export type { CreateCustomerInput, CreateCustomerResult } from './api/useCustomerMutations';
export {
  useAddCounterparty,
  useRespondToConnection,
  useSetCounterpartyStatus,
  useSetCounterpartyDiscount,
  useDeleteCounterparty,
} from './api/useCounterpartyMutations';
export { useCounterpartyActions } from './api/useCounterpartyActions';
export type { SupplierDialog } from './api/useCounterpartyActions';
export { useSupplierInvites } from './api/useSupplierInvites';
export type { InviteSent } from './api/useSupplierInvites';
export { useSubscriptionStatus, useRequestSubscription } from './api/useSubscriptionRequest';
export { useToggleCatalogPermission } from './api/useCatalogPermission';
export type {
  AddCounterpartyInput,
  AddCounterpartyResult,
} from './api/useCounterpartyMutations';

export {
  otherParty,
  isManufacturerSide,
  isIncomingRequest,
  isOutgoingRequest,
  counterpartyTitle,
  counterpartyNoun,
  pendingExplanation,
} from './domain/counterparty';
export type { Edge, Party } from './domain/counterparty';

export {
  verdictFor,
  verdictMessage,
  verdictTone,
  credentialsMode,
  requiresPassword,
  submitLabel,
  canSubmit,
} from './domain/vknLookup';
export type { OrgLookup, LookupVerdict, CredentialsMode } from './domain/vknLookup';

export { addCounterpartySchema, isSelfReference } from './domain/addSchema';
export type { AddCounterpartyForm } from './domain/addSchema';

export { CounterpartyTable } from './components/CounterpartyTable';
export { IncomingRequests } from './components/IncomingRequests';
export { AddCounterpartyDialog } from './components/AddCounterpartyDialog';
export { SubscriptionBanner } from './components/SubscriptionBanner';
export { PartyPicker } from './components/PartyPicker';
export { CustomerManager } from './components/CustomerManager';
export { CustomerTable } from './components/CustomerTable';
export { CustomerDialog } from './components/CustomerDialog';
export { VknNotice } from './components/VknNotice';
export { EditCustomerDialog } from './components/EditCustomerDialog';
export { ResetCustomerPasswordDialog } from './components/ResetCustomerPasswordDialog';
export { DeleteCounterpartyConfirm } from './components/DeleteCounterpartyConfirm';
export { InviteSupplierModal } from './components/InviteSupplierModal';
export type { InviteSupplierValues } from './components/InviteSupplierModal';
export { InviteSentDialog } from './components/InviteSentDialog';
export { SupplierInvitations } from './components/SupplierInvitations';
export { OutgoingRequests } from './components/OutgoingRequests';
export { SupplierTable } from './components/SupplierTable';
export { SupplierHeader } from './components/SupplierHeader';
export { SupplierTabs } from './components/SupplierTabs';
export type { SupplierTab } from './components/SupplierTabs';
