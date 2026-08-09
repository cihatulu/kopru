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
  useRequestSubscription,
} from './api/useCounterpartyMutations';
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
